package com.seapower.wiki.controller;

import com.seapower.wiki.config.GameConfig;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Serves loose image assets that live directly on disk (briefing maps, campaign
 * background art). Distinct from {@code /api/image/} which serves PNGs
 * extracted from the Unity {@code resources.assets} bundle — these are just
 * regular files in {@code StreamingAssets/original/}.
 *
 * <p>Security: paths must stay inside {@code original/} after normalization. We
 * resolve against {@code originalDir()}, then verify the canonical result still
 * has the original dir as its prefix to defeat {@code ../} traversal.
 */
@RestController
@RequestMapping("/api/asset")
public class AssetController {
    private final GameConfig gameConfig;

    public AssetController(GameConfig gameConfig) {
        this.gameConfig = gameConfig;
    }

    @GetMapping("/**")
    public ResponseEntity<Resource> get(HttpServletRequest request) {
        // Don't trust HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE — in
        // Spring Boot 3 / Spring 6 it sometimes returns the path *with* a leading
        // slash (e.g. "/campaigns/.../foo.png"), which makes Path.resolve treat it
        // as absolute and escape the base dir, tripping the safety check below
        // with a spurious 403. Parse the URI ourselves for predictable behavior.
        String uri = request.getRequestURI();
        int idx = uri.indexOf("/api/asset/");
        if (idx < 0) return ResponseEntity.badRequest().build();
        String raw = uri.substring(idx + "/api/asset/".length());
        if (raw.isEmpty()) return ResponseEntity.badRequest().build();
        // Decode percent-escapes (browsers encode spaces, parens, etc. in
        // mission names). Strip leading slashes defensively in case the URI is
        // weirdly normalized.
        String decoded = URLDecoder.decode(raw, StandardCharsets.UTF_8);
        while (decoded.startsWith("/")) decoded = decoded.substring(1);
        if (decoded.isEmpty()) return ResponseEntity.badRequest().build();

        Path base = gameConfig.originalDir().normalize().toAbsolutePath();
        Path target = base.resolve(decoded).normalize().toAbsolutePath();
        if (!target.startsWith(base)) {
            // Traversal attempt — refuse.
            return ResponseEntity.status(403).build();
        }
        if (!Files.isRegularFile(target)) return ResponseEntity.notFound().build();

        MediaType mt = guessMediaType(target.getFileName().toString());
        Resource resource = new FileSystemResource(target);
        return ResponseEntity.ok()
                .contentType(mt)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }

    private static MediaType guessMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
