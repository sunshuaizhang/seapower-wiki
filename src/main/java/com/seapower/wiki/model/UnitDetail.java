package com.seapower.wiki.model;

import java.util.List;
import java.util.Map;

/**
 * Full unit detail. Same envelope for all 4 categories; category-specific data
 * lives under the appropriate sub-fields (specs, weapons, sensors, variants).
 * Unpopulated lists simply stay empty.
 */
public record UnitDetail(
        String id,
        String category,
        String nation,
        String nationPrefix,
        String type,
        String name,
        String shortName,
        /** Localized role / sub-category (e.g. "商船", "渔船"). May be null. */
        String role,
        String description,

        /** Canonical key=value spec table — size, speed, armor, warhead power, etc. */
        Map<String, String> specs,

        /** Weapon mounts on vessels / aircraft / land_units. */
        List<WeaponMount> weapons,

        /** Sensors (radar/sonar/visual/esm). */
        List<Sensor> sensors,

        /** Ammunition magazines — weapon id → count. */
        List<Magazine> magazines,

        /** Service variants (hull numbers, squadron paintjobs, service dates). */
        List<Variant> variants,

        /** Air group carried (vessels / land_units with FlightDeck). */
        Map<String, String> airGroup,

        /** Texture names (not URLs) the frontend can request from /api/image/{name}. */
        Images images,

        /** Raw section dump for advanced view / debugging. */
        Map<String, Map<String, String>> raw
) {
    public record Images(String primary, String liveryAtlas, String flag) {}
    public record WeaponMount(
            String loadout,       // Default, Late, ...
            String slot,          // WeaponSystem1, WeaponSystem2...
            String type,          // Missile, Gun, Torpedo, CIWS, Chaff, Noisemaker
            String systemName,    // MK26, MK45, MK15, ...
            String ammunitionId,  // direct ammo reference, nullable
            String magazineRef    // AssociatedMagazine name, nullable
    ) {}

    public record Sensor(
            String slot,
            String type,          // Radar, Sonar, Visual, ESM, ECM
            String systemName
    ) {}

    public record Magazine(
            String name,
            String moduleType,    // SmallMagazine, MediumMagazine, ...
            List<AmmoEntry> contents
    ) {
        public record AmmoEntry(String ammoId, int count) {}
    }

    public record Variant(
            String slot,          // Default, Variant1, Squadron1
            String displayName,
            String shortName,
            String nation,
            String serviceDate,   // "1983|2004" or single year
            String notes,         // squadron / unit remark
            String hullnumberTexture,
            String emblemTexture,
            String liveryTexture,
            String flagTexture
    ) {}
}
