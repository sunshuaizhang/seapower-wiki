package com.seapower.wiki.model;

/**
 * Lightweight listing entry for a single mission. Returned by /api/missions to
 * populate the sidebar; the full content (formations, briefing, etc.) is in
 * {@link MissionDetail} and only loaded when a mission is opened.
 */
public record MissionSummary(
        /** File stem (the .ini name without extension). */
        String id,
        /** Folder under missions/, e.g. "NATO", "Warsaw Pact", "Tutorials". */
        String folder,
        /** Localized title, falling back to the en value if cn is missing. */
        String name,
        /** Mission date as "yyyy-MM-dd" (parsed from Date=Y,M,D). */
        String date,
        /** Difficulty rating 1-3 (game defaults to 1 if missing). */
        int difficulty,
        /** Reverse-geocoded label, e.g. "锡德拉湾 (32.05°N 20.01°E)" or just the
         *  raw coords when no nearby named point exists. */
        String location
) {}
