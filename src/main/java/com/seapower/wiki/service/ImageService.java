package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.config.ImageConfig;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Lazy, mtime-aware PNG cache for Unity textures.
 * Cache key: texture name (globally unique in the game's resources.assets).
 * Invalidation: cached PNG is re-extracted if the main resources.assets mtime is newer
 * than the cached PNG's mtime — i.e. a game patch automatically invalidates all images.
 */
@Service
public class ImageService {
    private static final Logger log = LoggerFactory.getLogger(ImageService.class);

    private final GameConfig gameConfig;
    private final ImageConfig imageConfig;
    private final UnityExtractorService extractor;

    private Path cacheDir;
    private final ConcurrentMap<String, Object> inFlight = new ConcurrentHashMap<>();

    public ImageService(GameConfig gameConfig, ImageConfig imageConfig, UnityExtractorService extractor) {
        this.gameConfig = gameConfig;
        this.imageConfig = imageConfig;
        this.extractor = extractor;
    }

    @PostConstruct
    void init() throws IOException {
        String base = imageConfig.getCacheDir();
        if (base == null || base.isBlank()) base = Paths.get("cache", "images").toString();
        cacheDir = Paths.get(base).toAbsolutePath();
        Files.createDirectories(cacheDir);
        log.info("Image cache dir: {}", cacheDir);
    }

    /**
     * Returns a Path to the PNG for the given texture name. If the file isn't cached
     * (or is stale vs the source assets), the extractor is invoked synchronously.
     * Returns empty if the texture doesn't exist in the game or the extractor is offline.
     */
    public Optional<Path> get(String name) {
        if (!imageConfig.isEnabled()) return Optional.empty();
        if (name == null || name.isBlank()) return Optional.empty();
        // Basic guard against path traversal: reject any path separators.
        if (name.contains("/") || name.contains("\\") || name.contains("..")) return Optional.empty();

        Path out = cacheDir.resolve(name + ".png");
        if (isFresh(out)) return Optional.of(out);

        // Single-flight: coalesce concurrent requests for the same name.
        Object lock = inFlight.computeIfAbsent(name, k -> new Object());
        synchronized (lock) {
            try {
                if (isFresh(out)) return Optional.of(out);
                UnityExtractorService.ExtractResult r = extractor.extract(name, out);
                if (r.ok()) return Optional.of(r.path());
                log.debug("Extract failed for {}: {}", name, r.error());
                return Optional.empty();
            } finally {
                inFlight.remove(name, lock);
            }
        }
    }

    private boolean isFresh(Path png) {
        if (!Files.exists(png)) return false;
        try {
            FileTime pngTime = Files.getLastModifiedTime(png);
            Path assets = gameConfig.dataDirPath().resolve("resources.assets");
            if (Files.exists(assets)) {
                FileTime assetTime = Files.getLastModifiedTime(assets);
                if (assetTime.compareTo(pngTime) > 0) return false;
            }
            return Files.size(png) > 0;
        } catch (IOException e) {
            return false;
        }
    }

    public boolean isEnabled() { return imageConfig.isEnabled(); }
}
