package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * Reverse-geocodes mission map centers to nearest named city/port. Game data
 * lists places as {@code [Name] Location=lat, lon} across multiple ini files
 * in {@code campaigns/} (split by region). All are loaded once at startup;
 * lookup is a linear scan since the corpus is small (<2000 points) and cold-
 * starting a spatial index isn't worth the complexity.
 */
@Service
public class LocationService {
    private final GameConfig gameConfig;
    private final List<Place> places = new ArrayList<>();

    public LocationService(GameConfig gameConfig) {
        this.gameConfig = gameConfig;
    }

    @PostConstruct
    void load() throws IOException {
        Path campaignsDir = gameConfig.originalDir().resolve("campaigns");
        if (!Files.isDirectory(campaignsDir)) return;
        try (Stream<Path> stream = Files.list(campaignsDir)) {
            stream
                    .filter(p -> {
                        String n = p.getFileName().toString().toLowerCase();
                        return n.endsWith(".ini") && (n.contains("cities") || n.contains("ports"));
                    })
                    .forEach(this::loadFile);
        }
    }

    private void loadFile(Path file) {
        try {
            IniDocument doc = IniParser.parse(file);
            for (var e : doc.sections().entrySet()) {
                String name = e.getKey();
                String loc = e.getValue().get("Location");
                if (loc == null) continue;
                String[] parts = loc.split(",");
                if (parts.length < 2) continue;
                try {
                    double lat = Double.parseDouble(parts[0].trim());
                    double lon = Double.parseDouble(parts[1].trim());
                    places.add(new Place(name, lat, lon));
                } catch (NumberFormatException ignored) { /* skip junk */ }
            }
        } catch (IOException ignored) { /* missing file is non-fatal */ }
    }

    /**
     * Pretty-print a (lat, lon) with the nearest named place prepended when one
     * is within ~150 nm (roughly 4-5 lat/lon degrees). Otherwise return just the
     * coordinate so the UI never shows an irrelevant distant landmark.
     */
    public String formatLocation(double lat, double lon) {
        String coords = String.format("%.2f°%s %.2f°%s",
                Math.abs(lat), lat >= 0 ? "N" : "S",
                Math.abs(lon), lon >= 0 ? "E" : "W");
        Place nearest = nearestWithin(lat, lon, 5.0);
        if (nearest == null) return coords;
        return nearest.name + " (" + coords + ")";
    }

    private Place nearestWithin(double lat, double lon, double degLimit) {
        Place best = null;
        double bestSq = degLimit * degLimit;
        for (Place p : places) {
            double dLat = p.lat - lat;
            double dLon = p.lon - lon;
            double sq = dLat * dLat + dLon * dLon;
            if (sq < bestSq) {
                bestSq = sq;
                best = p;
            }
        }
        return best;
    }

    private record Place(String name, double lat, double lon) {}
}
