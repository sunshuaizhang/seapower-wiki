package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.model.UnitDetail;
import com.seapower.wiki.model.UnitSummary;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Loads vessels / aircraft / land_units unit entries. Ammunition has its own
 * single-section language layout and a simpler INI, so it is handled in {@link AmmunitionService}.
 */
@Service
public class UnitService {
    private static final Set<String> UNIT_CATEGORIES = Set.of("vessels", "aircraft", "land_units");

    private final GameConfig gameConfig;
    private final LanguageService languageService;
    private final NationService nationService;
    private final FileCache<IniDocument> iniCache;

    public UnitService(GameConfig gameConfig, LanguageService languageService, NationService nationService) {
        this.gameConfig = gameConfig;
        this.languageService = languageService;
        this.nationService = nationService;
        this.iniCache = new FileCache<>(p -> {
            try { return IniParser.parse(p); } catch (IOException e) { throw new RuntimeException(e); }
        }, gameConfig.isCacheEnabled());
    }

    /** Scans the category directory and returns all primary unit ids (excluding _variants / _squadrons). */
    public List<String> listIds(String category) {
        Path dir = gameConfig.categoryDir(category);
        if (!Files.exists(dir)) return List.of();
        try (Stream<Path> stream = Files.list(dir)) {
            return stream
                    .filter(p -> p.getFileName().toString().endsWith(".ini"))
                    .map(p -> p.getFileName().toString())
                    .filter(n -> !n.endsWith("_variants.ini"))
                    .filter(n -> !n.endsWith("_squadrons.ini"))
                    .map(n -> n.substring(0, n.length() - 4))
                    .sorted()
                    .toList();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public List<UnitSummary> summaries(String category, String lang) {
        if (!UNIT_CATEGORIES.contains(category)) throw new IllegalArgumentException("Bad category: " + category);
        return listIds(category).stream()
                .map(id -> summary(category, id, lang))
                .collect(Collectors.toList());
    }

    public UnitSummary summary(String category, String id, String lang) {
        LanguageService.UnitNames names = languageService.unitNames(lang, category, id);
        String subType = null;
        // For land_units we want the subtype (SAM/Port/...). Pull only the [General] section to keep it cheap.
        if ("land_units".equals(category)) {
            IniDocument main = safeLoad(category, id);
            if (main != null) {
                IniDocument.IniSection g = main.section("General");
                if (g != null) subType = g.get("LandUnitSubType");
            }
        }
        return new UnitSummary(
                id, category,
                nationService.nationOf(id),
                nationService.prefixOf(id),
                names.typeShort(),
                names.defaultName() != null ? names.defaultName() : id,
                names.typeShort(),
                subType
        );
    }

    public UnitDetail detail(String category, String id, String lang) {
        if (!UNIT_CATEGORIES.contains(category)) throw new IllegalArgumentException("Bad category: " + category);
        IniDocument main = safeLoad(category, id);
        if (main == null) throw new NoSuchElementException("Unit not found: " + category + "/" + id);

        IniDocument sidecar = loadSidecar(category, id); // variants / squadrons — may be null
        LanguageService.UnitNames names = languageService.unitNames(lang, category, id);

        Map<String, String> specs = buildSpecs(category, main);
        List<UnitDetail.WeaponMount> weapons = extractWeapons(main);
        List<UnitDetail.Sensor> sensors = extractSensors(main);
        List<UnitDetail.Magazine> magazines = extractMagazines(main);
        List<UnitDetail.Variant> variants = extractVariants(sidecar, names);
        Map<String, String> airGroup = extractAirGroup(main);
        UnitDetail.Images images = extractImages(id, variants);

        Map<String, Map<String, String>> raw = toRaw(main);

        String typeDisplay = names.typeLong() != null && !names.typeLong().isEmpty()
                ? names.typeShort() + " — " + names.typeLong()
                : names.typeShort();

        return new UnitDetail(
                id, category,
                nationService.nationOf(id),
                nationService.prefixOf(id),
                typeDisplay,
                names.defaultName() != null ? names.defaultName() : id,
                names.typeShort(),
                names.defaultRole(),
                names.defaultDescription(),
                specs, weapons, sensors, magazines, variants, airGroup, images, raw
        );
    }

    /**
     * Primary image: a Texture2D inside resources.assets named exactly after the unit id,
     * e.g. {@code usn_cg_ticonderoga} (top-down for vessels, side view for aircraft).
     * This is the proper encyclopedia image; the {@code _tx} variant is an unfolded UV
     * atlas that only makes sense wrapped around the 3D mesh.
     */
    private UnitDetail.Images extractImages(String id, List<UnitDetail.Variant> variants) {
        String atlas = null, flag = null;
        for (UnitDetail.Variant v : variants) {
            if ("Default".equals(v.slot())) {
                atlas = firstNonBlank(atlas, v.liveryTexture());
                flag = firstNonBlank(flag, v.flagTexture());
                break;
            }
        }
        for (UnitDetail.Variant v : variants) {
            atlas = firstNonBlank(atlas, v.liveryTexture());
            flag = firstNonBlank(flag, v.flagTexture());
            if (atlas != null && flag != null) break;
        }
        return new UnitDetail.Images(id, atlas, flag);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }

    // ---------- internals ----------

    private IniDocument safeLoad(String category, String id) {
        Path p = gameConfig.categoryDir(category).resolve(id + ".ini");
        if (!Files.exists(p)) return null;
        return iniCache.get(p);
    }

    private IniDocument loadSidecar(String category, String id) {
        String suffix = "aircraft".equals(category) ? "_squadrons.ini" : "_variants.ini";
        Path p = gameConfig.categoryDir(category).resolve(id + suffix);
        if (!Files.exists(p)) return null;
        return iniCache.get(p);
    }

    private Map<String, String> buildSpecs(String category, IniDocument doc) {
        Map<String, String> specs = new LinkedHashMap<>();
        IniDocument.IniSection general = doc.section("General");
        if (general != null) {
            copyIfPresent(general, specs, "UnitType", "Unit Type");
            copyIfPresent(general, specs, "Length", "Length (m)");
            copyIfPresent(general, specs, "Beam", "Beam (m)");
            copyIfPresent(general, specs, "ArmorType", "Armor");
            copyIfPresent(general, specs, "DamagePoints", "Damage Points");
            copyIfPresent(general, specs, "LandUnitSubType", "Sub Type");
            copyIfPresent(general, specs, "DisplayClassName", "Display Class");
            copyIfPresent(general, specs, "Size", "Size");
        }
        IniDocument.IniSection physics = doc.section("Physics");
        if (physics != null) {
            copyIfPresent(physics, specs, "Displacement", "Displacement (t)");
            copyIfPresent(physics, specs, "MaxForwardVelocity", "Max Speed (kn)");
            copyIfPresent(physics, specs, "MaxBackwardVelocity", "Max Reverse (kn)");
        }
        IniDocument.IniSection mainPower = doc.section("MainPowerSystem");
        if (mainPower != null) {
            copyIfPresent(mainPower, specs, "Type", "Propulsion");
            copyIfPresent(mainPower, specs, "HorsePower", "Horsepower (hp)");
        }
        IniDocument.IniSection sensorData = doc.section("SensorData");
        if (sensorData != null) {
            copyIfPresent(sensorData, specs, "RCS", "RCS");
            copyIfPresent(sensorData, specs, "IRSignature", "IR Signature");
            copyIfPresent(sensorData, specs, "VisualIdentificationRange", "Visual ID Range (nm)");
            copyIfPresent(sensorData, specs, "BaseNoise", "Base Noise (dB)");
        }
        IniDocument.IniSection perf = doc.section("Performance");
        if (perf != null) {
            copyIfPresent(perf, specs, "WingSpan", "Wing Span (m)");
            copyIfPresent(perf, specs, "EmptyMass", "Empty Mass (kg)");
            copyIfPresent(perf, specs, "MaxFuel", "Max Fuel (kg)");
            copyIfPresent(perf, specs, "PerEngineMaxThrust", "Thrust per Engine (N)");
            copyIfPresent(perf, specs, "EngineCount", "Engine Count");
            copyIfPresent(perf, specs, "Ceiling", "Ceiling (ft)");
            copyIfPresent(perf, specs, "CruiseAltitude", "Cruise Altitude (ft)");
            copyIfPresent(perf, specs, "MaxSpeedAtSeaLevel", "Max Speed SL (kn)");
            copyIfPresent(perf, specs, "StallSpeed", "Stall Speed (kn)");
            copyIfPresent(perf, specs, "MachLimit", "Mach Limit");
            copyIfPresent(perf, specs, "MaxClimbRate", "Max Climb Rate (m/s)");
            copyIfPresent(perf, specs, "MaxG", "Max G");
        }
        IniDocument.IniSection ai = doc.section("AI");
        if (ai != null) {
            copyIfPresent(ai, specs, "Role", "Role");
            copyIfPresent(ai, specs, "AAW_Capability", "AAW Capability");
            copyIfPresent(ai, specs, "ASuW_Capability", "ASuW Capability");
            copyIfPresent(ai, specs, "ASW_Capability", "ASW Capability");
            copyIfPresent(ai, specs, "MissilesToSaturate", "Missiles to Saturate");
            copyIfPresent(ai, specs, "TorpedoesToSaturate", "Torpedoes to Saturate");
            copyIfPresent(ai, specs, "UnitCostValue", "Unit Cost");
            copyIfPresent(ai, specs, "UnitScoreValue", "Score Value");
        }
        return specs;
    }

    private static void copyIfPresent(IniDocument.IniSection src, Map<String, String> dst, String key, String label) {
        String v = src.get(key);
        if (v != null && !v.isEmpty()) dst.put(label, v);
    }

    private List<UnitDetail.WeaponMount> extractWeapons(IniDocument doc) {
        List<UnitDetail.WeaponMount> out = new ArrayList<>();
        // All WeaponSystemN (and WeaponSystemNLoadout) sections.
        for (Map.Entry<String, IniDocument.IniSection> e : doc.sections().entrySet()) {
            String name = e.getKey();
            if (!name.startsWith("WeaponSystem")) continue;
            String tail = name.substring("WeaponSystem".length());
            if (tail.isEmpty() || !Character.isDigit(tail.charAt(0))) continue;

            // Split index vs loadout: "1", "1Late"
            int i = 0;
            while (i < tail.length() && Character.isDigit(tail.charAt(i))) i++;
            String loadout = i == tail.length() ? "Default" : tail.substring(i);

            IniDocument.IniSection s = e.getValue();
            out.add(new UnitDetail.WeaponMount(
                    loadout,
                    name,
                    s.get("Type"),
                    s.get("SystemName"),
                    s.get("Ammunition"),
                    s.get("AssociatedMagazine")
            ));
        }
        return out;
    }

    private List<UnitDetail.Sensor> extractSensors(IniDocument doc) {
        List<UnitDetail.Sensor> out = new ArrayList<>();
        IniDocument.IniSection root = doc.section("SensorSystems");
        int count = root == null ? 0 : root.getInt("NumberOfSensorSystems", 0);
        for (int i = 1; i <= count; i++) {
            IniDocument.IniSection s = doc.section("SensorSystem" + i);
            if (s == null) continue;
            out.add(new UnitDetail.Sensor("SensorSystem" + i, s.get("Type"), s.get("SystemName")));
        }
        return out;
    }

    private List<UnitDetail.Magazine> extractMagazines(IniDocument doc) {
        List<UnitDetail.Magazine> out = new ArrayList<>();
        for (Map.Entry<String, IniDocument.IniSection> e : doc.sections().entrySet()) {
            String name = e.getKey();
            // Heuristic: magazine sections contain NumberOfAmmunitionTypes.
            IniDocument.IniSection s = e.getValue();
            String n = s.get("NumberOfAmmunitionTypes");
            if (n == null) continue;
            int count;
            try { count = Integer.parseInt(n.trim()); } catch (Exception ex) { continue; }
            List<UnitDetail.Magazine.AmmoEntry> list = new ArrayList<>();
            for (int i = 1; i <= count; i++) {
                String ammo = s.get("Ammunition" + i);
                String cnt = s.get("Ammunition" + i + "_Count");
                if (ammo == null) continue;
                int c = 0;
                try { c = Integer.parseInt(cnt == null ? "0" : cnt.trim()); } catch (Exception ignored) {}
                list.add(new UnitDetail.Magazine.AmmoEntry(ammo, c));
            }
            out.add(new UnitDetail.Magazine(name, s.get("ModuleType"), list));
        }
        return out;
    }

    private List<UnitDetail.Variant> extractVariants(IniDocument sidecar, LanguageService.UnitNames names) {
        List<UnitDetail.Variant> out = new ArrayList<>();
        Map<String, LanguageService.VariantNames> nameBySlot = new HashMap<>();
        if (names != null) {
            for (LanguageService.VariantNames vn : names.variants()) {
                nameBySlot.put(vn.slot(), vn);
            }
        }
        if (sidecar == null) return out;
        IniDocument.IniSection general = sidecar.section("General");
        int variantCount = 0;
        int squadronCount = 0;
        if (general != null) {
            variantCount = general.getInt("NumberOfVariants", 0);
            squadronCount = general.getInt("NumberOfSquadrons", 0);
        }
        // Default — common to both layouts
        IniDocument.IniSection def = sidecar.section("Default");
        if (def != null) {
            out.add(buildVariant("Default", def, nameBySlot.get("Default"), null));
        }
        for (int i = 1; i <= variantCount; i++) {
            IniDocument.IniSection s = sidecar.section("Variant" + i);
            if (s == null) continue;
            out.add(buildVariant("Variant" + i, s, nameBySlot.get("Variant" + i), null));
        }
        for (int i = 1; i <= squadronCount; i++) {
            IniDocument.IniSection s = sidecar.section("Squadron" + i);
            if (s == null) continue;
            out.add(buildVariant("Squadron" + i, s, null,
                    s.get("Nation") != null ? "Squadron " + i : null));
        }
        return out;
    }

    private UnitDetail.Variant buildVariant(String slot, IniDocument.IniSection s,
                                             LanguageService.VariantNames vn, String fallbackDisplay) {
        String displayName = vn != null ? vn.fullName() : fallbackDisplay;
        String shortName = vn != null ? vn.shortName() : null;
        String notes = vn != null ? vn.description() : null;
        return new UnitDetail.Variant(
                slot,
                displayName,
                shortName,
                nationService.translate(s.get("Nation")),
                s.get("ServiceDate"),
                notes,
                s.get("HullnumberTexture"),
                s.get("EmblemTexture"),
                s.get("LiveryTexture"),
                s.get("FlagTexture")
        );
    }

    private Map<String, String> extractAirGroup(IniDocument doc) {
        Map<String, String> out = new LinkedHashMap<>();
        IniDocument.IniSection s = doc.section("AirGroup");
        if (s == null) return out;
        for (String[] entry : s.entries()) {
            out.put(entry[0], entry[1]);
        }
        return out;
    }

    private static Map<String, Map<String, String>> toRaw(IniDocument doc) {
        Map<String, Map<String, String>> out = new LinkedHashMap<>();
        for (Map.Entry<String, IniDocument.IniSection> e : doc.sections().entrySet()) {
            out.put(e.getKey(), new LinkedHashMap<>(e.getValue().map()));
        }
        return out;
    }
}
