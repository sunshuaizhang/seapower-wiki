package com.seapower.wiki.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@ConfigurationProperties(prefix = "game")
public class GameConfig {
    private String streamingAssets;
    private String defaultLanguage = "en";
    private boolean cacheEnabled = true;
    private String dataDir;

    public Path dataDirPath() {
        if (dataDir != null && !dataDir.isBlank()) return Paths.get(dataDir);
        // fall back: StreamingAssets/.. (parent)
        return Paths.get(streamingAssets).getParent();
    }

    public String getDataDir() { return dataDir; }
    public void setDataDir(String dataDir) { this.dataDir = dataDir; }

    public Path originalDir() {
        return Paths.get(streamingAssets, "original");
    }

    public Path userDir() {
        return Paths.get(streamingAssets, "user");
    }

    public Path languageDir(String lang) {
        return originalDir().resolve("language_" + lang);
    }

    public Path categoryDir(String category) {
        return originalDir().resolve(category);
    }

    public Path nationsReference() {
        return originalDir().resolve("nations_reference.ini");
    }

    public String getStreamingAssets() { return streamingAssets; }
    public void setStreamingAssets(String streamingAssets) { this.streamingAssets = streamingAssets; }
    public String getDefaultLanguage() { return defaultLanguage; }
    public void setDefaultLanguage(String defaultLanguage) { this.defaultLanguage = defaultLanguage; }
    public boolean isCacheEnabled() { return cacheEnabled; }
    public void setCacheEnabled(boolean cacheEnabled) { this.cacheEnabled = cacheEnabled; }
}
