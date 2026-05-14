package com.seapower.wiki.model;

/** Lightweight row for listing / filtering. */
public record UnitSummary(
        String id,
        String category,       // vessels | aircraft | land_units | ammunition
        String nation,         // resolved nation (US, Soviet, Iran, ...)
        String nationPrefix,   // usn, wp, ir, ...
        String type,           // CG / SSN / Fighter / Airliner / SAM / AAM ...
        String name,           // Ticonderoga-class / AIM-7M Sparrow
        String shortName,
        String subType         // optional (LandUnitSubType, TargetType for ammo)
) {}
