package com.seapower.wiki.controller;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.model.AmmunitionDetail;
import com.seapower.wiki.model.UnitDetail;
import com.seapower.wiki.model.UnitSummary;
import com.seapower.wiki.service.AmmunitionService;
import com.seapower.wiki.service.LanguageService;
import com.seapower.wiki.service.NationService;
import com.seapower.wiki.service.UnitService;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class WikiController {
    private final UnitService unitService;
    private final AmmunitionService ammunitionService;
    private final NationService nationService;
    private final LanguageService languageService;
    private final GameConfig gameConfig;

    public WikiController(UnitService unitService, AmmunitionService ammunitionService,
                          NationService nationService, LanguageService languageService,
                          GameConfig gameConfig) {
        this.unitService = unitService;
        this.ammunitionService = ammunitionService;
        this.nationService = nationService;
        this.languageService = languageService;
        this.gameConfig = gameConfig;
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        return Map.of(
                "streamingAssets", gameConfig.getStreamingAssets(),
                "defaultLanguage", gameConfig.getDefaultLanguage(),
                "languages", List.of("en", "cn", "de", "es", "fr", "ja", "ko", "ru", "vn"),
                "categories", List.of("vessels", "aircraft", "land_units", "ammunition")
        );
    }

    @GetMapping("/nations")
    public Map<String, String> nations() {
        return nationService.all();
    }

    @GetMapping("/vessels")
    public List<UnitSummary> vessels(@RequestParam(defaultValue = "cn") String lang) {
        return unitService.summaries("vessels", resolveLang(lang));
    }

    @GetMapping("/aircraft")
    public List<UnitSummary> aircraft(@RequestParam(defaultValue = "cn") String lang) {
        return unitService.summaries("aircraft", resolveLang(lang));
    }

    @GetMapping("/land_units")
    public List<UnitSummary> landUnits(@RequestParam(defaultValue = "cn") String lang) {
        return unitService.summaries("land_units", resolveLang(lang));
    }

    @GetMapping("/ammunition")
    public List<UnitSummary> ammunition(@RequestParam(defaultValue = "cn") String lang) {
        return ammunitionService.summaries(resolveLang(lang));
    }

    @GetMapping("/vessel/{id}")
    public UnitDetail vessel(@PathVariable String id, @RequestParam(defaultValue = "cn") String lang) {
        return unitService.detail("vessels", id, resolveLang(lang));
    }

    @GetMapping("/aircraft/{id}")
    public UnitDetail aircraftDetail(@PathVariable String id, @RequestParam(defaultValue = "cn") String lang) {
        return unitService.detail("aircraft", id, resolveLang(lang));
    }

    @GetMapping("/land_unit/{id}")
    public UnitDetail landUnit(@PathVariable String id, @RequestParam(defaultValue = "cn") String lang) {
        return unitService.detail("land_units", id, resolveLang(lang));
    }

    @GetMapping("/ammo/{id}")
    public AmmunitionDetail ammo(@PathVariable String id, @RequestParam(defaultValue = "cn") String lang) {
        return ammunitionService.detail(id, resolveLang(lang));
    }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(org.springframework.http.HttpStatus.NOT_FOUND)
    public Map<String, String> notFound(NoSuchElementException e) {
        return Map.of("error", "not_found", "message", String.valueOf(e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
    public Map<String, String> badRequest(IllegalArgumentException e) {
        return Map.of("error", "bad_request", "message", String.valueOf(e.getMessage()));
    }

    private String resolveLang(String lang) {
        if (lang == null || lang.isBlank()) return gameConfig.getDefaultLanguage();
        return lang;
    }
}
