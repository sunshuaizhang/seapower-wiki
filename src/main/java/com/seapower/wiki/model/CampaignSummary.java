package com.seapower.wiki.model;

/**
 * Listing entry for a campaign. The wiki currently ships 2 campaigns; more are
 * expected as Sea Power expands. Type=Linear means a fixed mission timeline;
 * other values (currently absent / Sandbox-like) imply a dynamic roster.
 */
public record CampaignSummary(
        /** Folder name under campaigns/. */
        String id,
        String name,
        /** "Linear" or "Sandbox". */
        String type,
        /** Start date as "yyyy-MM-dd". */
        String startDate,
        /** Player nation canonical key (e.g. "US"). */
        String playerNation,
        /** Number of missions in the linear timeline (0 for sandbox). */
        int missionCount,
        /** Number of PlayerSurfaceGroups entries. */
        int groupCount,
        /** Campaign background image asset path (relative to StreamingAssets/original). */
        String backgroundImage
) {}
