package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Reads the language_{lang}/{category}_names.ini files. These files have one section per
 * unit-id, with keys: Type, Default, DefaultDescription, Variant1..N (and their descriptions),
 * Variant1Description, ...  For the ammunition file, every non-[General] section holds a
 * single {@code id=Name,Codename,Category,Description} line — different layout.
 */
@Service
public class LanguageService {
    private final GameConfig gameConfig;
    private final FileCache<IniDocument> docCache;

    /** Numeric enum index → canonical key, mirroring the comment tables in ammunition INIs. */
    private static final List<String> GUIDANCE_TYPE_BY_NUM = List.of(
            "None", "IRHoming", "SemiActiveRadarHoming", "ActiveRadarHoming",
            "AntiRadiationHoming", "LaserHoming", "TVHoming",
            "ActiveSonarHoming", "PassiveSonarHoming", "WakeHoming",
            "ActivePassiveSonarHoming"
    );
    private static final List<String> MID_COURSE_BY_NUM = List.of("None", "RadioCommand", "WireGuided");
    private static final List<String> WARHEAD_TYPE_BY_NUM = List.of(
            "Fragmentation", "ArmorPiercing", "HEAT",
            "Illumination", "Cluster", "RunwayCratering"
    );

    public LanguageService(GameConfig gameConfig) {
        this.gameConfig = gameConfig;
        this.docCache = new FileCache<>(p -> {
            try { return IniParser.parse(p); } catch (IOException e) { throw new RuntimeException(e); }
        }, gameConfig.isCacheEnabled());
    }

    /**
     * Look up an enum translation in {@code language_{lang}/ui.ini}'s {@code [section]} block.
     * Falls back to default language, then to {@code key} unchanged.
     */
    public String translateEnum(String section, String key, String lang) {
        if (key == null || key.isEmpty()) return key;
        IniDocument doc = uiDoc(lang);
        if (doc != null) {
            IniDocument.IniSection s = doc.section(section);
            if (s != null) {
                String v = s.get(key);
                if (v != null && !v.isEmpty()) return v;
            }
        }
        if (!gameConfig.getDefaultLanguage().equals(lang)) {
            return translateEnum(section, key, gameConfig.getDefaultLanguage());
        }
        return key;
    }

    /** Translate a numeric enum (GuidanceType / WarheadType / MidCourseCorrection). */
    public String translateNumericEnum(String section, String numericValue, String lang) {
        if (numericValue == null || numericValue.isEmpty()) return numericValue;
        int idx;
        try { idx = Integer.parseInt(numericValue.trim()); } catch (NumberFormatException e) {
            return translateEnum(section, numericValue, lang);
        }
        List<String> table = switch (section) {
            case "GuidanceType" -> GUIDANCE_TYPE_BY_NUM;
            case "MidCourseCorrection" -> MID_COURSE_BY_NUM;
            case "WarheadType" -> WARHEAD_TYPE_BY_NUM;
            default -> List.of();
        };
        if (idx < 0 || idx >= table.size()) return numericValue;
        return translateEnum(section, table.get(idx), lang);
    }

    private IniDocument uiDoc(String lang) {
        Path p = gameConfig.languageDir(lang).resolve("ui.ini");
        if (!Files.exists(p)) return null;
        return docCache.get(p);
    }

    private Path file(String lang, String category) {
        String fileName = switch (category) {
            case "vessels" -> "vessel_names.ini";
            case "aircraft" -> "aircraft_names.ini";
            case "land_units" -> "land_units_names.ini";
            case "ammunition" -> "ammunition_names.ini";
            default -> throw new IllegalArgumentException("Unknown category: " + category);
        };
        return gameConfig.languageDir(lang).resolve(fileName);
    }

    public IniDocument document(String lang, String category) {
        Path p = file(lang, category);
        if (!Files.exists(p)) {
            // fall back to default language if requested one is missing
            String fallback = gameConfig.getDefaultLanguage();
            if (!fallback.equals(lang)) return document(fallback, category);
            return new IniDocument();
        }
        return docCache.get(p);
    }

    /**
     * For vessels/aircraft/land_units: look up a per-unit section with Type / Default /
     * DefaultDescription / VariantN / VariantNDescription.
     */
    public UnitNames unitNames(String lang, String category, String id) {
        IniDocument doc = document(lang, category);
        IniDocument.IniSection s = doc.section(id);
        if (s == null) {
            // fall back to default language
            String fallback = gameConfig.getDefaultLanguage();
            if (!fallback.equals(lang)) {
                s = document(fallback, category).section(id);
            }
        }
        if (s == null) return new UnitNames(null, null, null, null, null, List.of());

        String typeLine = s.get("Type");
        String defLine = s.get("Default");
        String desc = unescapeInlineText(s.get("DefaultDescription"));
        String[] typeParts = splitLimited(typeLine, 2);
        String[] defParts = splitLimited(defLine, 2);

        List<VariantNames> variants = new ArrayList<>();
        int i = 1;
        while (true) {
            String v = s.get("Variant" + i);
            if (v == null) break;
            String[] parts = splitLimited(v, 2);
            String vdesc = unescapeInlineText(s.get("Variant" + i + "Description"));
            variants.add(new VariantNames("Variant" + i,
                    parts.length > 0 ? parts[0] : null,
                    parts.length > 1 ? parts[1] : null,
                    vdesc));
            i++;
        }

        return new UnitNames(
                typeParts.length > 0 ? typeParts[0] : null,
                typeParts.length > 1 ? typeParts[1] : null,
                defParts.length > 0 ? defParts[0] : null,
                defParts.length > 1 ? defParts[1] : null,
                desc,
                variants
        );
    }

    /**
     * For ammunition: the file's sole data section is typically [AmmunitionNames]
     * with lines like {@code usn_aim-7m=AIM-7M,Sparrow,AAM,description...}.
     */
    public AmmoNames ammunitionNames(String lang, String id) {
        IniDocument doc = document(lang, "ammunition");
        IniDocument.IniSection s = doc.section("AmmunitionNames");
        if (s == null) {
            // fallback language
            String fb = gameConfig.getDefaultLanguage();
            if (!fb.equals(lang)) s = document(fb, "ammunition").section("AmmunitionNames");
        }
        if (s == null) return new AmmoNames(null, null, null, null);
        String raw = s.get(id);
        if (raw == null) {
            // fallback language content
            String fb = gameConfig.getDefaultLanguage();
            if (!fb.equals(lang)) {
                IniDocument.IniSection s2 = document(fb, "ammunition").section("AmmunitionNames");
                if (s2 != null) raw = s2.get(id);
            }
        }
        if (raw == null) return new AmmoNames(null, null, null, null);
        String[] parts = splitLimited(raw, 4);
        return new AmmoNames(
                parts.length > 0 ? emptyToNull(parts[0]) : null,
                parts.length > 1 ? emptyToNull(parts[1]) : null,
                parts.length > 2 ? emptyToNull(parts[2]) : null,
                parts.length > 3 ? unescapeInlineText(parts[3]) : null
        );
    }

    private static String emptyToNull(String s) {
        return s == null || s.isEmpty() ? null : s;
    }

    /**
     * Convert the game's inline text escapes into their character equivalents.
     * Description fields in language INIs use {@code \n} (two literal chars,
     * not the control byte) for line breaks; some entries may also use
     * {@code \t} and {@code \\}. Other backslash sequences are left as-is so
     * we don't accidentally mangle real file paths.
     */
    static String unescapeInlineText(String s) {
        if (s == null || s.indexOf('\\') < 0) return s;
        StringBuilder out = new StringBuilder(s.length());
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < s.length()) {
                char next = s.charAt(i + 1);
                switch (next) {
                    case 'n': out.append('\n'); i += 2; continue;
                    case 'r': out.append('\r'); i += 2; continue;
                    case 't': out.append('\t'); i += 2; continue;
                    case '\\': out.append('\\'); i += 2; continue;
                    default:
                        out.append(c);
                        i++;
                        continue;
                }
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /**
     * Split on comma, at most {@code limit} pieces; preserves commas inside the final piece
     * (needed for description fields that legitimately contain commas).
     */
    static String[] splitLimited(String s, int limit) {
        if (s == null) return new String[0];
        if (limit <= 1) return new String[]{s};
        String[] out = new String[limit];
        int filled = 0;
        StringBuilder buf = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == ',' && filled < limit - 1) {
                out[filled++] = buf.toString().strip();
                buf.setLength(0);
            } else {
                buf.append(c);
            }
        }
        out[filled++] = buf.toString().strip();
        if (filled < limit) {
            String[] trimmed = new String[filled];
            System.arraycopy(out, 0, trimmed, 0, filled);
            return trimmed;
        }
        return out;
    }

    public record UnitNames(String typeShort, String typeLong, String defaultName,
                            String defaultRole, String defaultDescription,
                            List<VariantNames> variants) {}

    public record VariantNames(String slot, String fullName, String shortName, String description) {}

    public record AmmoNames(String name, String codename, String category, String description) {}
}
