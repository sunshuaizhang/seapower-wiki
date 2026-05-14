package com.seapower.wiki.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.config.ImageConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Owns a single long-lived Python (UnityPy) subprocess. Thread-safe: only one extract
 * at a time (the daemon protocol is line-synchronous), other callers wait. On failure
 * the process is restarted on next call.
 */
@Service
public class UnityExtractorService {
    private static final Logger log = LoggerFactory.getLogger(UnityExtractorService.class);

    private final GameConfig gameConfig;
    private final ImageConfig imageConfig;
    private final ObjectMapper json = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    private volatile Process process;
    private volatile BufferedWriter stdin;
    private volatile BufferedReader stdout;
    private volatile Thread stderrPump;
    private volatile boolean ready;
    private volatile int indexed = -1;

    public UnityExtractorService(GameConfig gameConfig, ImageConfig imageConfig) {
        this.gameConfig = gameConfig;
        this.imageConfig = imageConfig;
    }

    @PostConstruct
    void initAsync() {
        if (!imageConfig.isEnabled()) {
            log.info("Image extractor disabled (images.enabled=false).");
            return;
        }
        // Start asynchronously so app startup is not blocked on ~2s index build.
        Thread t = new Thread(this::startUnchecked, "unity-extractor-init");
        t.setDaemon(true);
        t.start();
    }

    private void startUnchecked() {
        try { start(); } catch (Exception e) { log.warn("Extractor daemon failed to start: {}", e.toString()); }
    }

    private synchronized void start() throws IOException, InterruptedException {
        if (process != null && process.isAlive() && ready) return;
        Path script = Paths.get(imageConfig.getScript());
        if (!Files.exists(script)) throw new IOException("Extractor script missing: " + script.toAbsolutePath());
        Path dataDir = gameConfig.dataDirPath();
        if (!Files.isDirectory(dataDir)) throw new IOException("Game data dir missing: " + dataDir);

        ProcessBuilder pb = new ProcessBuilder(
                imageConfig.getPythonBin(),
                "-u",
                script.toString(),
                dataDir.toString()
        );
        pb.environment().put("PYTHONIOENCODING", "utf-8");
        // stderr is captured to a pump thread for logging; stdout is the protocol channel.
        pb.redirectErrorStream(false);
        process = pb.start();
        stdin = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
        stdout = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
        stderrPump = new Thread(() -> {
            try (BufferedReader err = new BufferedReader(new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = err.readLine()) != null) log.info("[daemon] {}", line);
            } catch (IOException ignored) { }
        }, "unity-extractor-stderr");
        stderrPump.setDaemon(true);
        stderrPump.start();

        // Expect an immediate "starting" event, then a "ready" event.
        long deadline = System.currentTimeMillis() + imageConfig.getStartupTimeoutSec() * 1000L;
        boolean sawStarting = false;
        while (System.currentTimeMillis() < deadline) {
            String line = stdout.readLine();
            if (line == null) throw new IOException("Extractor process exited during startup");
            Map<?, ?> msg = json.readValue(line, Map.class);
            Object event = msg.get("event");
            if ("starting".equals(event)) { sawStarting = true; continue; }
            if ("ready".equals(event)) {
                Object n = msg.get("indexed");
                indexed = n instanceof Number num ? num.intValue() : -1;
                ready = true;
                log.info("Unity extractor ready. indexed={} textures.", indexed);
                return;
            }
            if ("load_failed".equals(event)) {
                throw new IOException("Extractor load failed: " + msg.get("error"));
            }
        }
        if (!sawStarting) throw new IOException("Extractor startup timed out (no output)");
        throw new IOException("Extractor startup timed out (no ready event)");
    }

    public boolean isReady() { return ready; }
    public int getIndexed() { return indexed; }

    public ExtractResult extract(String name, Path out) {
        if (!imageConfig.isEnabled()) return ExtractResult.disabled();
        try {
            ensureAlive();
        } catch (Exception e) {
            return ExtractResult.failed("daemon_unavailable: " + e.getMessage());
        }
        lock.lock();
        try {
            Map<String, Object> req = Map.of(
                    "cmd", "extract",
                    "name", name,
                    "out", out.toAbsolutePath().toString()
            );
            stdin.write(json.writeValueAsString(req));
            stdin.write("\n");
            stdin.flush();

            String line = readWithTimeout(imageConfig.getRequestTimeoutSec());
            if (line == null) {
                killProcess();
                return ExtractResult.failed("timeout");
            }
            Map<?, ?> resp = json.readValue(line, Map.class);
            if (Boolean.TRUE.equals(resp.get("ok"))) {
                Object w = resp.get("width"), h = resp.get("height");
                return ExtractResult.ok(name,
                        Paths.get(String.valueOf(resp.get("path"))),
                        w instanceof Number nw ? nw.intValue() : 0,
                        h instanceof Number nh ? nh.intValue() : 0);
            }
            return ExtractResult.failed(String.valueOf(resp.get("error")));
        } catch (IOException e) {
            killProcess();
            return ExtractResult.failed("io: " + e.getMessage());
        } finally {
            lock.unlock();
        }
    }

    public boolean exists(String name) {
        if (!imageConfig.isEnabled()) return false;
        try { ensureAlive(); } catch (Exception e) { return false; }
        lock.lock();
        try {
            stdin.write(json.writeValueAsString(Map.of("cmd", "exists", "name", name)));
            stdin.write("\n");
            stdin.flush();
            String line = readWithTimeout(5);
            if (line == null) return false;
            Map<?, ?> resp = json.readValue(line, Map.class);
            return Boolean.TRUE.equals(resp.get("exists"));
        } catch (IOException e) {
            return false;
        } finally {
            lock.unlock();
        }
    }

    private void ensureAlive() throws IOException, InterruptedException {
        if (process == null || !process.isAlive() || !ready) {
            ready = false;
            killProcess();
            start();
        }
    }

    /** Poll stdout with a wall-clock budget. Returns null if timed out. */
    private String readWithTimeout(int seconds) throws IOException {
        long end = System.currentTimeMillis() + seconds * 1000L;
        while (System.currentTimeMillis() < end) {
            if (stdout.ready() || !process.isAlive()) {
                return stdout.readLine();
            }
            try { Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); return null; }
        }
        return null;
    }

    private void killProcess() {
        ready = false;
        try { if (stdin != null) stdin.close(); } catch (IOException ignored) {}
        try { if (stdout != null) stdout.close(); } catch (IOException ignored) {}
        if (process != null) {
            process.destroy();
            try { process.waitFor(2, TimeUnit.SECONDS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            if (process.isAlive()) process.destroyForcibly();
        }
        process = null;
    }

    @PreDestroy
    void shutdown() {
        if (process == null) return;
        try {
            if (process.isAlive() && stdin != null) {
                stdin.write("{\"cmd\":\"shutdown\"}\n");
                stdin.flush();
                process.waitFor(3, TimeUnit.SECONDS);
            }
        } catch (Exception ignored) {
        } finally {
            killProcess();
        }
    }

    public record ExtractResult(boolean ok, String name, Path path, int width, int height, String error) {
        public static ExtractResult ok(String name, Path path, int w, int h) {
            return new ExtractResult(true, name, path, w, h, null);
        }
        public static ExtractResult failed(String err) {
            return new ExtractResult(false, null, null, 0, 0, err);
        }
        public static ExtractResult disabled() {
            return new ExtractResult(false, null, null, 0, 0, "disabled");
        }
    }
}
