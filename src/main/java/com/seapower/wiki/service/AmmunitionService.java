package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.model.AmmunitionDetail;
import com.seapower.wiki.model.UnitSummary;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Stream;

@Service
public class AmmunitionService {
    private final GameConfig gameConfig;
    private final LanguageService languageService;
    private final NationService nationService;
    private final FileCache<IniDocument> iniCache;

    public AmmunitionService(GameConfig gameConfig, LanguageService languageService, NationService nationService) {
        this.gameConfig = gameConfig;
        this.languageService = languageService;
        this.nationService = nationService;
        this.iniCache = new FileCache<>(p -> {
            try { return IniParser.parse(p); } catch (IOException e) { throw new RuntimeException(e); }
        }, gameConfig.isCacheEnabled());
    }

    /**
     * Ammunition ids are driven by the language file (not the directory), because only
     * a subset of ammunition/*.ini correspond to encyclopedia-visible entries, and some
     * entries exist only in the language file.
     */
    public List<String> listIds(String lang) {
        IniDocument doc = languageService.document(lang, "ammunition");
        IniDocument.IniSection s = doc.section("AmmunitionNames");
        if (s == null) {
            // fall back to default lang
            doc = languageService.document(gameConfig.getDefaultLanguage(), "ammunition");
            s = doc.section("AmmunitionNames");
        }
        if (s == null) return List.of();
        List<String> ids = new ArrayList<>(s.map().keySet());
        Collections.sort(ids);
        return ids;
    }

    public List<UnitSummary> summaries(String lang) {
        List<UnitSummary> out = new ArrayList<>();
        for (String id : listIds(lang)) {
            LanguageService.AmmoNames n = languageService.ammunitionNames(lang, id);
            String displayName = n.codename() != null && !n.codename().isEmpty()
                    ? n.name() + " " + n.codename()
                    : n.name();
            if (displayName == null || displayName.isBlank()) displayName = id;
            out.add(new UnitSummary(
                    id, "ammunition",
                    nationService.nationOf(id),
                    nationService.prefixOf(id),
                    n.category(),
                    displayName,
                    n.name(),
                    null
            ));
        }
        return out;
    }

    public AmmunitionDetail detail(String id, String lang) {
        LanguageService.AmmoNames n = languageService.ammunitionNames(lang, id);
        Map<String, String> specs = new LinkedHashMap<>();
        Map<String, Map<String, String>> raw = new LinkedHashMap<>();
        String type = null, targetType = null;

        Path file = gameConfig.categoryDir("ammunition").resolve(id + ".ini");
        if (Files.exists(file)) {
            IniDocument doc = iniCache.get(file);
            IniDocument.IniSection g = doc.section("General");
            if (g != null) {
                type = languageService.translateEnum("AmmunitionType", g.get("Type"), lang);
                targetType = languageService.translateEnum("AmmunitionTarget", g.get("TargetType"), lang);
                putIf(specs, "类型", type);
                putIf(specs, "目标类型", targetType);
                putIf(specs, "重量 (kg)", g.get("Mass"));
                putIf(specs, "弹药点数", g.get("AmmoPoints"));
            }
            IniDocument.IniSection wh = doc.section("WarheadData");
            if (wh != null) {
                putIf(specs, "战斗部类型",
                        languageService.translateNumericEnum("WarheadType", wh.get("WarheadType"), lang));
                putIf(specs, "战斗部威力", wh.get("Power"));
                putIf(specs, "杀伤规模",
                        languageService.translateEnum("ImpactSize", wh.get("ImpactSize"), lang));
                putIf(specs, "穿透",
                        languageService.translateEnum("AmmunitionPenetration", wh.get("Penetration"), lang));
                putIf(specs, "近炸距离 (m)", wh.get("FuzeProximityDistance"));
                putIf(specs, "命中概率", wh.get("KillProbability"));
            }
            // Missile / torpedo kinematics live in [Guidance], not [Performance].
            IniDocument.IniSection guid = doc.section("Guidance");
            if (guid != null) {
                putIf(specs, "制导方式",
                        languageService.translateNumericEnum("GuidanceType", guid.get("GuidanceType"), lang));
                putIf(specs, "中段修正",
                        languageService.translateNumericEnum("MidCourseCorrection", guid.get("MidCourseCorrection"), lang));
                putIf(specs, "最大射程 (nm)", guid.get("MaxLaunchRange"));
                putIf(specs, "最小射程 (nm)", guid.get("MinLaunchRange"));
                putIf(specs, "最大速度 (kn)", guid.get("MaxVelocity"));
                putIf(specs, "最大转向率 (°/s)", guid.get("MaxTurnRate"));
                putIf(specs, "加速度 (G)", guid.get("Acceleration"));
                putIf(specs, "助推时长 (s)", guid.get("AccelerationTime"));
                putIf(specs, "续推加速度 (G)", guid.get("SustainerAcceleration"));
                putIf(specs, "续推时长 (s)", guid.get("SustainerAccelerationTime"));
                putIf(specs, "最大飞行时长 (s)", guid.get("MaxFlightTime"));
                // Air-to-air / SAM altitude envelope
                putIf(specs, "最低交战高度 (ft)", guid.get("MinAttackAltitude"));
                putIf(specs, "最高交战高度 (ft)", guid.get("MaxAttackAltitude"));
                putIf(specs, "最大目标速度 (kn)", guid.get("MaxAttackVelocity"));
                // Torpedo / air-launched envelope
                putIf(specs, "最低发射高度 (ft)", guid.get("MinLaunchAltitude"));
                putIf(specs, "最高发射高度 (ft)", guid.get("MaxLaunchAltitude"));
                putIf(specs, "最大下潜深度 (ft)", guid.get("MaxDepth"));
                putIf(specs, "发射可靠性 (%)", guid.get("LaunchReliability"));
                // Seeker (some are inside [Guidance], some in their own section — best-effort)
                putIf(specs, "导引头视野 (°)", guid.get("SeekerFOV"));
                putIf(specs, "导引头主动距离 (nm)", guid.get("SeekerActiveRange"));
            }
            IniDocument.IniSection sensor = doc.section("SensorData");
            if (sensor != null) {
                putIf(specs, "雷达截面积",
                        languageService.translateEnum("Signatures", sensor.get("RCS"), lang));
                putIf(specs, "红外特征", sensor.get("IRSignature"));
                putIf(specs, "目视识别距离 (nm)", sensor.get("VisualIdentificationRange"));
            }
            for (Map.Entry<String, IniDocument.IniSection> e : doc.sections().entrySet()) {
                raw.put(e.getKey(), new LinkedHashMap<>(e.getValue().map()));
            }
        }

        return new AmmunitionDetail(
                id,
                nationService.nationOf(id),
                nationService.prefixOf(id),
                n.name() != null ? n.name() : id,
                n.codename(),
                n.category(),
                n.description(),
                type, targetType,
                specs, raw
        );
    }

    private static void putIf(Map<String, String> map, String label, String v) {
        if (v != null && !v.isEmpty()) map.put(label, v);
    }

    /** Convenience: check if an ammunition id exists (used by UI to gate "click for detail" links). */
    public boolean exists(String id) {
        Path file = gameConfig.categoryDir("ammunition").resolve(id + ".ini");
        return Files.exists(file);
    }

    /**
     * Stable English Type from the ammo's INI [General].Type — used to label aircraft
     * hardpoint station loads (Missile / Torpedo / Sonobuoy / Bomb / Fueltank / …).
     * Returns null if the ammo INI is missing or has no Type field.
     */
    public String typeOf(String ammoId) {
        if (ammoId == null || ammoId.isEmpty()) return null;
        Path file = gameConfig.categoryDir("ammunition").resolve(ammoId + ".ini");
        if (!Files.exists(file)) return null;
        IniDocument doc = iniCache.get(file);
        IniDocument.IniSection g = doc.section("General");
        if (g == null) return null;
        String t = g.get("Type");
        return (t == null || t.isEmpty()) ? null : t;
    }
}
