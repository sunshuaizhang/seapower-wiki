package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.model.Briefing;
import com.seapower.wiki.model.MissionDetail;
import com.seapower.wiki.model.MissionSummary;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Stream;

/**
 * Lists and loads single-mission INI files under {@code missions/<folder>/}.
 *
 * <p>Each mission ships as one main INI plus a sibling {@code <name>_briefing/}
 * folder holding XAML briefing text and PNG maps. Only {@code Language_<lang>}
 * sections inside the main INI carry translated content — we pick the requested
 * language with fallback to en. Heavy parsing happens lazily per-detail-call.
 *
 * <p>Listing is cached after the first directory scan since folder contents
 * rarely change while the wiki is up. Per-mission INI parses are cached via
 * the same {@link FileCache} pattern used elsewhere.
 */
@Service
public class MissionService {

    /** Default taskforce names used by mission INIs when [Mission] doesn't
     *  explicitly set PlayerTaskforce / EnemyTaskforce. Shared with
     *  CampaignService for embedded missions. */
    static final String DEFAULT_PLAYER_TASKFORCE = "Taskforce1";
    static final String DEFAULT_ENEMY_TASKFORCE = "Taskforce2";

    private final GameConfig gameConfig;
    private final LocationService locationService;
    private final BriefingParser briefingParser;
    private final FileCache<IniDocument> iniCache;

    public MissionService(GameConfig gameConfig,
                          LocationService locationService,
                          BriefingParser briefingParser) {
        this.gameConfig = gameConfig;
        this.locationService = locationService;
        this.briefingParser = briefingParser;
        this.iniCache = new FileCache<>(p -> {
            try { return IniParser.parse(p); } catch (IOException e) { throw new RuntimeException(e); }
        }, gameConfig.isCacheEnabled());
    }

    public List<MissionSummary> list(String lang) {
        Path missionsDir = gameConfig.originalDir().resolve("missions");
        if (!Files.isDirectory(missionsDir)) return List.of();
        List<MissionSummary> out = new ArrayList<>();
        try (Stream<Path> folders = Files.list(missionsDir)) {
            for (Path folder : (Iterable<Path>) folders.sorted()::iterator) {
                if (!Files.isDirectory(folder)) continue;
                String folderName = folder.getFileName().toString();
                try (Stream<Path> files = Files.list(folder)) {
                    for (Path file : (Iterable<Path>) files.sorted()::iterator) {
                        String fn = file.getFileName().toString();
                        if (!fn.endsWith(".ini")) continue;
                        if (!Files.isRegularFile(file)) continue;
                        String id = fn.substring(0, fn.length() - 4);
                        MissionSummary s = trySummary(folder, folderName, id, lang);
                        if (s != null) out.add(s);
                    }
                }
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return out;
    }

    private MissionSummary trySummary(Path folder, String folderName, String id, String lang) {
        Path file = folder.resolve(id + ".ini");
        IniDocument doc = iniCache.get(file);
        if (doc == null) return null;
        IniDocument.IniSection langSec = pickLanguageSection(doc, lang);
        String name = langSec != null ? langSec.get("Name") : null;
        if (name == null || name.isBlank()) name = id;

        IniDocument.IniSection env = doc.section("Environment");
        String date = parseDate(env);
        IniDocument.IniSection mission = doc.section("Mission");
        int difficulty = mission == null ? 1 : mission.getInt("Difficulty", 1);

        double lat = env == null ? 0.0 : env.getDouble("MapCenterLatitude", 0.0);
        double lon = env == null ? 0.0 : env.getDouble("MapCenterLongitude", 0.0);
        String location = (lat == 0.0 && lon == 0.0)
                ? "—"
                : locationService.formatLocation(lat, lon);

        return new MissionSummary(id, folderName, name, date, difficulty, location);
    }

    public MissionDetail detail(String folder, String id, String lang) {
        Path file = gameConfig.originalDir()
                .resolve("missions").resolve(folder).resolve(id + ".ini");
        if (!Files.exists(file)) throw new NoSuchElementException("Mission not found: " + folder + "/" + id);
        IniDocument doc = iniCache.get(file);

        IniDocument.IniSection langSec = pickLanguageSection(doc, lang);
        String name = langSec != null ? langSec.get("Name") : null;
        if (name == null || name.isBlank()) name = id;
        String description = langSec != null ? langSec.get("Description") : null;

        IniDocument.IniSection env = doc.section("Environment");
        String date = parseDate(env);
        String time = parseTime(env);
        IniDocument.IniSection mission = doc.section("Mission");
        int difficulty = mission == null ? 1 : mission.getInt("Difficulty", 1);

        double lat = env == null ? 0.0 : env.getDouble("MapCenterLatitude", 0.0);
        double lon = env == null ? 0.0 : env.getDouble("MapCenterLongitude", 0.0);
        String location = (lat == 0.0 && lon == 0.0)
                ? "—"
                : locationService.formatLocation(lat, lon);

        MissionDetail.Environment environment = new MissionDetail.Environment(
                date, time,
                env == null ? null : env.get("SeaState"),
                env == null ? null : env.get("Clouds"),
                env == null ? null : env.get("WindDirection"),
                lat, lon
        );

        String playerTaskforce = mission == null ? DEFAULT_PLAYER_TASKFORCE : mission.get("PlayerTaskforce");
        if (playerTaskforce == null || playerTaskforce.isBlank()) playerTaskforce = DEFAULT_PLAYER_TASKFORCE;
        String enemyTaskforce = mission == null ? DEFAULT_ENEMY_TASKFORCE : mission.get("EnemyTaskforce");
        if (enemyTaskforce == null || enemyTaskforce.isBlank()) enemyTaskforce = DEFAULT_ENEMY_TASKFORCE;

        MissionDetail.Side playerSide = countSide(mission, playerTaskforce, "我方");
        MissionDetail.Side enemySide  = countSide(mission, enemyTaskforce,  "敌方");

        List<MissionDetail.Formation> formations = extractFormations(mission, playerTaskforce, enemyTaskforce);
        List<MissionDetail.Unit> units = extractUnits(doc, playerTaskforce, enemyTaskforce);
        List<MissionDetail.Objective> objectives = extractObjectives(langSec);

        // Briefing — same folder as the mission, in a sibling <id>_briefing dir.
        Path briefingDir = gameConfig.originalDir()
                .resolve("missions").resolve(folder).resolve(id + "_briefing");
        Briefing briefing = loadBriefing(briefingDir, lang);
        String mapImage = firstMapImage(briefingDir);

        return new MissionDetail(
                id, folder, name, description, date, time, difficulty, location,
                environment, playerSide, enemySide, formations, units, objectives,
                briefing, mapImage
        );
    }

    // ---------- helpers ----------

    private static IniDocument.IniSection pickLanguageSection(IniDocument doc, String lang) {
        String want = "Language_" + lang;
        IniDocument.IniSection s = doc.section(want);
        if (s != null) return s;
        return doc.section("Language_en"); // graceful fallback
    }

    static String parseDate(IniDocument.IniSection env) {
        if (env == null) return null;
        String d = env.get("Date");
        if (d == null) return null;
        String[] parts = d.split(",");
        if (parts.length < 3) return d.trim();
        try {
            int y = Integer.parseInt(parts[0].trim());
            int m = Integer.parseInt(parts[1].trim());
            int day = Integer.parseInt(parts[2].trim());
            return String.format("%04d-%02d-%02d", y, m, day);
        } catch (NumberFormatException e) {
            return d.trim();
        }
    }

    static String parseTime(IniDocument.IniSection env) {
        if (env == null) return null;
        String t = env.get("Time");
        if (t == null) return null;
        String[] parts = t.split(",");
        if (parts.length < 2) return t.trim();
        try {
            int h = Integer.parseInt(parts[0].trim());
            int m = Integer.parseInt(parts[1].trim());
            return String.format("%02d:%02d", h, m);
        } catch (NumberFormatException e) {
            return t.trim();
        }
    }

    static MissionDetail.Side countSide(IniDocument.IniSection mission,
                                         String taskforce, String label) {
        if (mission == null) return new MissionDetail.Side(taskforce, label, 0, 0, 0, 0, 0);
        // Game keys: NumberOfTaskforce1Vessels, NumberOfTaskforce1Aircraft, etc.
        int v = mission.getInt("NumberOf" + taskforce + "Vessels", 0);
        int a = mission.getInt("NumberOf" + taskforce + "Aircraft", 0);
        int s = mission.getInt("NumberOf" + taskforce + "Submarines", 0);
        int h = mission.getInt("NumberOf" + taskforce + "Helicopters", 0);
        int l = mission.getInt("NumberOf" + taskforce + "LandUnits", 0);
        return new MissionDetail.Side(taskforce, label, v, a, s, h, l);
    }

    /**
     * Formations live in {@code [Mission]} as
     * {@code Taskforce1_Formation1=Taskforce1Vessel1,...|Group Name|Loose|1.5|...}.
     * We split on pipes to get the user-facing pieces.
     */
    static List<MissionDetail.Formation> extractFormations(IniDocument.IniSection mission,
                                                            String playerTf, String enemyTf) {
        List<MissionDetail.Formation> out = new ArrayList<>();
        if (mission == null) return out;
        for (String[] entry : mission.entries()) {
            String key = entry[0];
            String val = entry[1];
            if (val == null || val.isEmpty()) continue;
            String side;
            if (key.startsWith(playerTf + "_Formation")) side = "player";
            else if (key.startsWith(enemyTf + "_Formation")) side = "enemy";
            else continue;
            String[] parts = val.split("\\|");
            if (parts.length < 1) continue;
            String[] slots = parts[0].split(",");
            List<String> slotList = new ArrayList<>(slots.length);
            for (String s : slots) {
                String trimmed = s.trim();
                if (!trimmed.isEmpty()) slotList.add(trimmed);
            }
            String name = parts.length > 1 ? parts[1].trim() : null;
            String pattern = parts.length > 2 ? parts[2].trim() : null;
            out.add(new MissionDetail.Formation(side, name, pattern, slotList));
        }
        return out;
    }

    static List<MissionDetail.Unit> extractUnits(IniDocument doc,
                                                  String playerTf, String enemyTf) {
        List<MissionDetail.Unit> out = new ArrayList<>();
        for (Map.Entry<String, IniDocument.IniSection> e : doc.sections().entrySet()) {
            String slot = e.getKey();
            String side;
            if (slot.startsWith(playerTf)) side = "player";
            else if (slot.startsWith(enemyTf)) side = "enemy";
            else if (slot.startsWith("Neutral")) side = "neutral";
            else continue;
            // Filter to actual unit sections (have a Type=) — skip "Taskforce1" wrapper if any.
            IniDocument.IniSection s = e.getValue();
            String type = s.get("Type");
            if (type == null || type.isBlank()) continue;
            // Slot must contain "Vessel" / "Aircraft" / "Submarine" / "Helicopter" / "LandUnit"
            // so we don't pick up unrelated Taskforce-prefixed keys.
            if (!slot.matches(".*(Vessel|Aircraft|Submarine|Helicopter|LandUnit)\\d+$")) continue;
            out.add(new MissionDetail.Unit(
                    slot, side, type,
                    s.get("VariantReference"),
                    s.get("MissionType"),
                    s.get("Name")
            ));
        }
        return out;
    }

    private static List<MissionDetail.Objective> extractObjectives(IniDocument.IniSection langSec) {
        List<MissionDetail.Objective> out = new ArrayList<>();
        if (langSec == null) return out;
        for (String[] entry : langSec.entries()) {
            if (entry[0].startsWith("Objective_")) {
                String text = entry[1];
                if (text != null && !text.isBlank()) {
                    out.add(new MissionDetail.Objective(entry[0], text));
                }
            }
        }
        return out;
    }

    private Briefing loadBriefing(Path briefingDir, String lang) {
        if (!Files.isDirectory(briefingDir)) return null;
        Briefing localized = briefingParser.parseFile(
                briefingDir.resolve("BriefingText_" + lang + ".xml"));
        if (localized != null) return localized;
        return briefingParser.parseFile(briefingDir.resolve("BriefingText_en.xml"));
    }

    /** Best-effort: pick the first PNG in the briefing folder for the hero image. */
    private static String firstMapImage(Path briefingDir) {
        if (!Files.isDirectory(briefingDir)) return null;
        try (Stream<Path> stream = Files.list(briefingDir)) {
            return stream
                    .filter(p -> p.getFileName().toString().toLowerCase().endsWith(".png"))
                    .map(Path::getFileName)
                    .map(Path::toString)
                    .findFirst()
                    .orElse(null);
        } catch (IOException e) {
            return null;
        }
    }
}
