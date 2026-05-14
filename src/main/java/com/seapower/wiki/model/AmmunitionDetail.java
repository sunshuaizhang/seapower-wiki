package com.seapower.wiki.model;

import java.util.Map;

/** Ammunition-specific encyclopedia entry (resolved via ammunition_names + ammunition/*.ini). */
public record AmmunitionDetail(
        String id,
        String nation,
        String nationPrefix,
        String name,
        String codename,          // e.g. Sparrow, Harpoon, Sidewinder
        String category,          // AAM, SAM, AShM, Torpedo, ...
        String description,
        String type,              // Projectile / Missile / Torpedo / RBU / ASROC / Chaff
        String targetType,        // AAW / ASuW / ASW
        Map<String, String> specs,
        Map<String, Map<String, String>> raw
) {}
