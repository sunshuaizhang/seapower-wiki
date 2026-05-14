package com.seapower.wiki.controller;

import com.seapower.wiki.service.ImageService;
import com.seapower.wiki.service.UnityExtractorService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class ImageController {
    private final ImageService imageService;
    private final UnityExtractorService extractor;

    public ImageController(ImageService imageService, UnityExtractorService extractor) {
        this.imageService = imageService;
        this.extractor = extractor;
    }

    @GetMapping("/image/status")
    public Map<String, Object> status() {
        return Map.of(
                "enabled", imageService.isEnabled(),
                "ready", extractor.isReady(),
                "indexed", extractor.getIndexed()
        );
    }

    @GetMapping("/image/{name:.+}")
    public ResponseEntity<FileSystemResource> image(@PathVariable String name) {
        // allow ".png" suffix in URL for user convenience — strip it
        String clean = name.endsWith(".png") ? name.substring(0, name.length() - 4) : name;
        Optional<Path> p = imageService.get(clean);
        if (p.isEmpty()) return ResponseEntity.notFound().build();
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.IMAGE_PNG);
        h.setCacheControl("public, max-age=86400");
        return ResponseEntity.ok().headers(h).body(new FileSystemResource(p.get().toFile()));
    }
}
