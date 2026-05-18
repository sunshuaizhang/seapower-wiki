package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps a unit-id prefix (usn, wp, ir, ...) to a localized nation name.
 *
 * <p>Two-step resolution at startup:
 * <ol>
 *   <li>{@code original/nations_reference.ini} → prefix (e.g. {@code civ}) → canonical
 *       English NationName key (e.g. {@code Civilian}).</li>
 *   <li>{@code language_{lang}/nations.ini}  [Nations]  section → English key →
 *       displayed name (e.g. {@code 平民}).</li>
 * </ol>
 *
 * <p>The same {@code [Nations]} dictionary is used to translate the {@code Nation=UK}
 * value found inside {@code _variants.ini}, since variants store the canonical English
 * key as well.
 */
@Service
public class NationService {
    private final GameConfig gameConfig;
    private final Map<String, String> prefixToCanonical = new LinkedHashMap<>();
    private final Map<String, String> canonicalToLocalized = new LinkedHashMap<>();

    public NationService(GameConfig gameConfig) {
        this.gameConfig = gameConfig;
    }

    /**
     * Supplementary prefix → canonical nation map. nations_reference.ini ships with only
     * 17 entries (US/Soviet/Civilian/Iran/etc.), but the game data uses extra prefixes
     * for smaller fleets (knm = Royal Norwegian Navy, fgs = Federal German Ship, …).
     * These canonical keys must match entries in language_{lang}/nations.ini so they
     * pick up a localized name. Verified against each unit's _variants.ini Nation= field.
     */
    private static final Map<String, String> SUPPLEMENTARY_PREFIX = Map.ofEntries(
            // ----- Naval / military prefixes the game data uses but doesn't register -----
            Map.entry("knm",   "Norway"),
            Map.entry("fgs",   "Germany"),
            Map.entry("ger",   "Germany"),
            Map.entry("es",    "Spain"),
            Map.entry("ln",    "Libya"),
            Map.entry("nrp",   "Portugal"),
            Map.entry("pns",   "Pakistan"),
            Map.entry("fr",    "France"),
            Map.entry("it",    "Italy"),
            Map.entry("bel",   "Belgium"),
            Map.entry("fin",   "Finland"),
            Map.entry("is",    "Iceland"),
            Map.entry("swe",   "Sweden"),
            Map.entry("nv",    "Vietnam"),
            Map.entry("iqaf",  "Iraq"),
            Map.entry("iqa",   "Iraq"),
            Map.entry("iriaf", "Iran"),
            Map.entry("irina", "Iran"),
            Map.entry("jasdf", "Japan"),
            Map.entry("jsdf",  "Japan"),
            Map.entry("pla",   "China"),
            Map.entry("usmc",  "US"),
            Map.entry("usa",   "US"),
            // ----- Soviet "sea_*" mines and similar -----
            Map.entry("sea",   "Soviet"),
            // ----- Generic / multi-national / non-national items -----
            Map.entry("nato",        "All"),
            Map.entry("all",         "All"),
            Map.entry("test",        "All"),
            Map.entry("airfield",    "All"),
            Map.entry("oil",         "All"),
            Map.entry("port",        "All"),
            Map.entry("warehouses",  "All"),
            Map.entry("tgt",         "All"),
            Map.entry("shared",      "All")
    );

    @PostConstruct
    void load() throws IOException {
        Path file = gameConfig.nationsReference();
        if (Files.exists(file)) {
            IniDocument doc = IniParser.parse(file);
            IniDocument.IniSection general = doc.section("General");
            int count = general == null ? 0 : general.getInt("NumberOfNations", 0);
            for (int i = 1; i <= count; i++) {
                IniDocument.IniSection s = doc.section("Nation" + i);
                if (s == null) continue;
                String prefix = s.get("NationPrefix");
                String name = s.get("NationName");
                if (prefix != null && name != null) {
                    prefixToCanonical.put(prefix, name);
                }
            }
        }
        // Fill in prefixes the game file omits, but never override an explicit mapping.
        for (Map.Entry<String, String> e : SUPPLEMENTARY_PREFIX.entrySet()) {
            prefixToCanonical.putIfAbsent(e.getKey(), e.getValue());
        }
        Path nationsLang = gameConfig.languageDir(gameConfig.getDefaultLanguage()).resolve("nations.ini");
        if (Files.exists(nationsLang)) {
            IniDocument doc = IniParser.parse(nationsLang);
            IniDocument.IniSection s = doc.section("Nations");
            if (s != null) {
                canonicalToLocalized.putAll(s.map());
            }
        }
    }

    /** Derive nation prefix from unit id — first underscore-separated segment. */
    public String prefixOf(String id) {
        int u = id.indexOf('_');
        return u < 0 ? id : id.substring(0, u);
    }

    /** Localized display name for a unit id (prefix → English key → translated). */
    public String nationOf(String id) {
        String canonical = prefixToCanonical.getOrDefault(prefixOf(id), prefixOf(id));
        return canonicalToLocalized.getOrDefault(canonical, canonical);
    }

    /** Translate a canonical English nation name (e.g. "UK") to display form ("英国"). */
    public String translate(String canonicalName) {
        if (canonicalName == null) return null;
        return canonicalToLocalized.getOrDefault(canonicalName, canonicalName);
    }

    public Map<String, String> all() { return prefixToCanonical; }
}
