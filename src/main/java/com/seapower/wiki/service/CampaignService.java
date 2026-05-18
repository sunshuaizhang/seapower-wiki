package com.seapower.wiki.service;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.model.CampaignDetail;
import com.seapower.wiki.model.CampaignSummary;
import com.seapower.wiki.model.MissionDetail;
import com.seapower.wiki.parser.IniDocument;
import com.seapower.wiki.parser.IniParser;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Lists and loads {@code campaigns/<id>/campaign.ini}. Linear campaigns also
 * have a {@code missions/} subfolder with numbered files (e.g. "01 Foo.ini",
 * "04A Bar.ini") — we expose those as a timeline so the UI can render a stepper.
 */
@Service
public class CampaignService {
    private final GameConfig gameConfig;
    private final FileCache<IniDocument> iniCache;

    /** Matches "04A Title" / "1 Foo" / "12 Bar" etc. — order + optional letter branch. */
    private static final Pattern TIMELINE_PREFIX = Pattern.compile("^(\\d+)([A-Z])?\\s+");

    public CampaignService(GameConfig gameConfig) {
        this.gameConfig = gameConfig;
        this.iniCache = new FileCache<>(p -> {
            try { return IniParser.parse(p); } catch (IOException e) { throw new RuntimeException(e); }
        }, gameConfig.isCacheEnabled());
    }

    public List<CampaignSummary> list(String lang) {
        Path campaignsDir = gameConfig.originalDir().resolve("campaigns");
        if (!Files.isDirectory(campaignsDir)) return List.of();
        List<CampaignSummary> out = new ArrayList<>();
        try (Stream<Path> stream = Files.list(campaignsDir)) {
            for (Path folder : (Iterable<Path>) stream.sorted()::iterator) {
                if (!Files.isDirectory(folder)) continue;
                Path ini = folder.resolve("campaign.ini");
                if (!Files.exists(ini)) continue;
                CampaignSummary s = trySummary(folder, ini, lang);
                if (s != null) out.add(s);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return out;
    }

    private CampaignSummary trySummary(Path folder, Path ini, String lang) {
        String id = folder.getFileName().toString();
        IniDocument doc = iniCache.get(ini);
        if (doc == null) return null;
        IniDocument.IniSection camp = doc.section("Campaign");
        String type = (camp == null || camp.get("Type") == null) ? "Sandbox" : camp.get("Type");
        String bg = camp == null ? null : camp.get("BackgroundImage");

        IniDocument.IniSection langSec = pickLanguageSection(doc, lang);
        String name = langSec == null ? id : Optional.ofNullable(langSec.get("Name")).orElse(id);

        IniDocument.IniSection env = doc.section("Environment");
        String start = startDate(env);

        IniDocument.IniSection player = doc.section("PlayerSide");
        String nation = player == null ? null : player.get("PlayerNation");

        IniDocument.IniSection groups = doc.section("PlayerSurfaceGroups");
        int groupCount = groups == null ? 0 : groups.getInt("NumberOfGroups", 0);

        int missionCount = countTimelineMissions(folder);

        return new CampaignSummary(id, name, type, start, nation, missionCount, groupCount, bg);
    }

    public CampaignDetail detail(String id, String lang) {
        Path folder = gameConfig.originalDir().resolve("campaigns").resolve(id);
        Path ini = folder.resolve("campaign.ini");
        if (!Files.exists(ini)) throw new NoSuchElementException("Campaign not found: " + id);

        IniDocument doc = iniCache.get(ini);
        IniDocument.IniSection camp = doc.section("Campaign");
        String type = (camp == null || camp.get("Type") == null) ? "Sandbox" : camp.get("Type");
        String bg = camp == null ? null : camp.get("BackgroundImage");

        IniDocument.IniSection langSec = pickLanguageSection(doc, lang);
        String name = langSec == null ? id : Optional.ofNullable(langSec.get("Name")).orElse(id);
        String description = langSec == null ? null : langSec.get("Description");

        IniDocument.IniSection env = doc.section("Environment");
        String start = startDate(env);

        IniDocument.IniSection player = doc.section("PlayerSide");
        String nation = player == null ? null : player.get("PlayerNation");
        List<String> friendly = parseCsv(player == null ? null : player.get("FriendlyNations"));

        List<CampaignDetail.TimelineMission> missions = loadTimeline(folder, lang);

        List<CampaignDetail.PortGroup> ports = buildPortGroups(doc.section("PlayerSurfaceGroups"));

        return new CampaignDetail(id, name, description, type, start, nation,
                friendly, missions, ports, bg);
    }

    // ---------- helpers ----------

    private static IniDocument.IniSection pickLanguageSection(IniDocument doc, String lang) {
        String want = "Language_" + lang;
        IniDocument.IniSection s = doc.section(want);
        if (s != null) return s;
        return doc.section("Language_en");
    }

    private static String startDate(IniDocument.IniSection env) {
        if (env == null) return null;
        int y = env.getInt("StartYear", 0);
        int m = env.getInt("StartMonth", 1);
        int d = env.getInt("StartDay", 1);
        if (y == 0) return null;
        return String.format("%04d-%02d-%02d", y, m, d);
    }

    private int countTimelineMissions(Path folder) {
        Path missionsDir = folder.resolve("missions");
        if (!Files.isDirectory(missionsDir)) return 0;
        try (Stream<Path> stream = Files.list(missionsDir)) {
            return (int) stream
                    .filter(p -> p.getFileName().toString().endsWith(".ini"))
                    .count();
        } catch (IOException e) {
            return 0;
        }
    }

    private List<CampaignDetail.TimelineMission> loadTimeline(Path folder, String lang) {
        Path missionsDir = folder.resolve("missions");
        if (!Files.isDirectory(missionsDir)) return List.of();
        List<CampaignDetail.TimelineMission> out = new ArrayList<>();
        try (Stream<Path> stream = Files.list(missionsDir)) {
            for (Path file : (Iterable<Path>) stream.sorted()::iterator) {
                String fn = file.getFileName().toString();
                if (!fn.endsWith(".ini")) continue;
                String stem = fn.substring(0, fn.length() - 4);
                Matcher m = TIMELINE_PREFIX.matcher(stem);
                int order = 0;
                String branch = null;
                if (m.find()) {
                    try { order = Integer.parseInt(m.group(1)); }
                    catch (NumberFormatException ignored) {}
                    branch = m.group(2);
                }
                // Pull mission-level metadata so each timeline node carries enough
                // info to read at a glance — name, date, difficulty, summary —
                // plus the full description + objectives + OOB for the expanded
                // card.
                String displayName = stem;
                String date = null;
                int difficulty = 1;
                String summary = null;
                String description = null;
                List<String> objectives = new ArrayList<>();
                MissionDetail.Side playerSide = new MissionDetail.Side("Taskforce1", "我方", 0, 0, 0, 0, 0);
                MissionDetail.Side enemySide  = new MissionDetail.Side("Taskforce2", "敌方", 0, 0, 0, 0, 0);
                List<MissionDetail.Formation> formations = List.of();
                List<MissionDetail.Unit> units = List.of();
                IniDocument mdoc = iniCache.get(file);
                if (mdoc != null) {
                    IniDocument.IniSection ls = pickLanguageSection(mdoc, lang);
                    if (ls != null) {
                        String n = ls.get("Name");
                        if (n != null && !n.isBlank()) displayName = n;
                        String desc = ls.get("Description");
                        if (desc != null && !desc.isBlank()) {
                            description = desc;
                            // Compact one-line summary — strip newlines, cap length.
                            String s = desc.replace('\n', ' ').replace('\r', ' ').trim();
                            summary = s.length() > 140 ? s.substring(0, 140) + "…" : s;
                        }
                        for (String[] entry : ls.entries()) {
                            if (entry[0] != null && entry[0].startsWith("Objective_")
                                    && entry[1] != null && !entry[1].isBlank()) {
                                objectives.add(entry[1]);
                            }
                        }
                    }
                    date = MissionService.parseDate(mdoc.section("Environment"));
                    IniDocument.IniSection ms = mdoc.section("Mission");
                    if (ms != null) {
                        difficulty = ms.getInt("Difficulty", 1);
                        String pTf = Optional.ofNullable(ms.get("PlayerTaskforce"))
                                .filter(s -> !s.isBlank())
                                .orElse(MissionService.DEFAULT_PLAYER_TASKFORCE);
                        String eTf = Optional.ofNullable(ms.get("EnemyTaskforce"))
                                .filter(s -> !s.isBlank())
                                .orElse(MissionService.DEFAULT_ENEMY_TASKFORCE);
                        playerSide  = MissionService.countSide(ms, pTf, "我方");
                        enemySide   = MissionService.countSide(ms, eTf, "敌方");
                        formations  = MissionService.extractFormations(ms, pTf, eTf);
                        units       = MissionService.extractUnits(mdoc, pTf, eTf);
                    }
                }
                out.add(new CampaignDetail.TimelineMission(
                        stem, displayName, branch, order, date, difficulty, summary,
                        description, objectives,
                        playerSide, enemySide, formations, units));
            }
        } catch (IOException e) {
            return List.of();
        }
        out.sort(Comparator
                .comparingInt(CampaignDetail.TimelineMission::order)
                .thenComparing(t -> Optional.ofNullable(t.branch()).orElse("")));
        return out;
    }

    private static List<String> parseCsv(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        String[] parts = raw.split(",");
        List<String> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String t = p.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    /**
     * Walk {@code Group<N>Name / Group<N>Location / Group<N>Units} triplets,
     * bucket by port, and expand each unit string into a {@link CampaignDetail.UnitRow}.
     * Unit format: {@code unitId | hullNumber | missionType} — the missionType is
     * sometimes "False" which we leave verbatim (treat as "not deployed").
     */
    private static List<CampaignDetail.PortGroup> buildPortGroups(IniDocument.IniSection gs) {
        if (gs == null) return List.of();
        int n = gs.getInt("NumberOfGroups", 0);
        // Use LinkedHashMap to preserve port insertion order (first time seen wins).
        Map<String, List<CampaignDetail.Group>> byPort = new LinkedHashMap<>();
        for (int i = 1; i <= n + 50; i++) { // +50 slack for non-contiguous numbering
            String name = gs.get("Group" + i + "Name");
            String location = gs.get("Group" + i + "Location");
            String unitsRaw = gs.get("Group" + i + "Units");
            if (name == null && location == null && unitsRaw == null) continue;
            String port = location == null ? "未指定" : location;
            List<CampaignDetail.UnitRow> rows = parseUnitList(unitsRaw);
            CampaignDetail.Group group = new CampaignDetail.Group(
                    name == null ? "Group " + i : name, rows.size(), rows);
            byPort.computeIfAbsent(port, k -> new ArrayList<>()).add(group);
        }
        List<CampaignDetail.PortGroup> out = new ArrayList<>(byPort.size());
        for (Map.Entry<String, List<CampaignDetail.Group>> e : byPort.entrySet()) {
            out.add(new CampaignDetail.PortGroup(e.getKey(), e.getValue()));
        }
        return out;
    }

    private static List<CampaignDetail.UnitRow> parseUnitList(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        String[] parts = raw.split(",");
        List<CampaignDetail.UnitRow> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String t = p.trim();
            if (t.isEmpty()) continue;
            String[] seg = t.split("\\|");
            String unitId = seg[0].trim();
            String hull = seg.length > 1 ? seg[1].trim() : "";
            String mt = seg.length > 2 ? seg[2].trim() : "";
            out.add(new CampaignDetail.UnitRow(unitId, hull, mt));
        }
        return out;
    }
}
