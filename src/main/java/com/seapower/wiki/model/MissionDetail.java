package com.seapower.wiki.model;

import java.util.List;

/**
 * Full mission payload returned by /api/mission/{folder}/{id}.
 * Identity fields mirror {@link MissionSummary} so the frontend can render the
 * hero block immediately on detail open without waiting for any list lookup.
 */
public record MissionDetail(
        String id,
        String folder,
        String name,
        String description,
        String date,
        String time,         // "HH:mm" 24h, parsed from Time=H,M
        int difficulty,
        String location,
        Environment environment,
        Side playerSide,
        Side enemySide,
        List<Formation> formations,
        List<Unit> units,
        List<Objective> objectives,
        Briefing briefing,
        /** Briefing map PNG asset name (no extension), or null if missing.
         *  Frontend builds the URL via /api/asset/{path}.png . */
        String mapImage
) {
    public record Environment(
            String date,
            String time,
            String seaState,
            String clouds,
            String windDirection,
            double mapCenterLat,
            double mapCenterLon
    ) {}

    public record Side(
            /** "Taskforce1" / "Taskforce2" / etc. */
            String taskforce,
            String label,        // "我方" / "敌方"
            int vessels,
            int aircraft,
            int submarines,
            int helicopters,
            int landUnits
    ) {}

    public record Formation(
            String side,         // "player" / "enemy"
            String name,         // user-visible group name e.g. "Task Group 60.2"
            String pattern,      // "Loose" / "LineAstern" / "Vic" / ...
            List<String> unitSlots // ["Taskforce1Vessel1", "Taskforce1Vessel2"]
    ) {}

    public record Unit(
            String slot,         // "Taskforce1Vessel1"
            String side,         // "player" / "enemy" / "neutral"
            String unitId,       // game id like "usn_cv_forrestal_75"
            String variant,      // "Variant2" / "Default" / null
            String missionType,  // "Patrol" / "Escort" / etc.
            String nameOverride  // explicit naming override (rare)
    ) {}

    public record Objective(
            String key,          // raw INI key like "Objective_DestroySAMRadar"
            String text          // localized text
    ) {}
}
