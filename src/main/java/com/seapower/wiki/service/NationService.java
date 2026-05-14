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
