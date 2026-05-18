package com.seapower.wiki.model;

import java.util.List;

public record CampaignDetail(
        String id,
        String name,
        String description,
        String type,
        String startDate,
        String playerNation,
        /** List of canonical nation keys friendly to the player. */
        List<String> friendlyNations,
        /** Mission names in the linear timeline, in display order.
         *  Empty for sandbox campaigns. */
        List<TimelineMission> missions,
        /** Player surface groups, port-grouped for the UI's two-level fold. */
        List<PortGroup> ports,
        String backgroundImage
) {
    /** A single node on the Linear campaign timeline. Carries enough detail to
     *  render an expanded mission card inline (no extra round-trip needed). */
    public record TimelineMission(
            /** File stem inside campaigns/<id>/missions/, e.g. "01 Operation Shadow". */
            String missionId,
            String name,
            /** Branch tag extracted from the file prefix: "4A" → branch "A".
             *  Null for non-branching nodes. */
            String branch,
            /** Numeric ordering (e.g. 1, 2, 3, 4, 5 — branches share a number). */
            int order,
            /** Mission date as "yyyy-MM-dd", from the mission INI's [Environment].Date. */
            String date,
            /** Difficulty 1-3 from [Mission].Difficulty. */
            int difficulty,
            /** Short description (≤140 chars) for the always-visible card preview. */
            String summary,
            /** Full description text from Language_<lang>.Description — shown when
             *  the user expands the node. */
            String description,
            /** Localized objective texts in declaration order. */
            List<String> objectives,
            /** Order of Battle — same shape as MissionDetail's, so the frontend
             *  can drop the existing OrderOfBattle component straight in. */
            MissionDetail.Side playerSide,
            MissionDetail.Side enemySide,
            List<MissionDetail.Formation> formations,
            List<MissionDetail.Unit> units
    ) {}

    /** Two-level: port (default folded) → groups → unit lines. */
    public record PortGroup(
            String port,
            List<Group> groups
    ) {}

    public record Group(
            String name,         // "SUBRON 6"
            int unitCount,
            List<UnitRow> units
    ) {}

    public record UnitRow(
            String unitId,       // game id like "usn_ssn_sturgeon"
            String hullNumber,   // "20" / "21" / ... extracted from "id|20|Patrol"
            String missionType   // "Patrol" / "Escort" / "False" / ""
    ) {}
}
