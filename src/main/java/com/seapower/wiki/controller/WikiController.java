package com.seapower.wiki.controller;

import com.seapower.wiki.config.GameConfig;
import com.seapower.wiki.model.AmmunitionDetail;
import com.seapower.wiki.model.CampaignDetail;
import com.seapower.wiki.model.CampaignSummary;
import com.seapower.wiki.model.MissionDetail;
import com.seapower.wiki.model.MissionSummary;
import com.seapower.wiki.model.UnitDetail;
import com.seapower.wiki.model.UnitSummary;
import com.seapower.wiki.service.AmmunitionService;
import com.seapower.wiki.service.CampaignService;
import com.seapower.wiki.service.LanguageService;
import com.seapower.wiki.service.MissionService;
import com.seapower.wiki.service.NationService;
import com.seapower.wiki.service.UnitService;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
public class WikiController {
    private final UnitService unitService;
    private final AmmunitionService ammunitionService;
    private final NationService nationService;
    private final LanguageService languageService;
    private final MissionService missionService;
    private final CampaignService campaignService;
    private final GameConfig gameConfig;

    public WikiController(UnitService unitService, AmmunitionService ammunitionService,
                          NationService nationService, LanguageService languageService,
                          MissionService missionService, CampaignService campaignService,
                          GameConfig gameConfig) {
        this.unitService = unitService;
        this.ammunitionService = ammunitionService;
        this.nationService = nationService;
        this.languageService = languageService;
        this.missionService = missionService;
        this.campaignService = campaignService;
        this.gameConfig = gameConfig;
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("streamingAssets", gameConfig.getStreamingAssets());
        out.put("defaultLanguage", gameConfig.getDefaultLanguage());
        out.put("languages", List.of("en", "cn", "de", "es", "fr", "ja", "ko", "ru", "vn"));
        out.put("categories", List.of("vessels", "aircraft", "land_units", "ammunition"));
        Map<String, String> ver = parseGameVersion();
        if (ver != null) out.put("gameVersion", ver);
        return out;
    }

    // First non-comment line of <gameRoot>/changelog.txt looks like
    //   "10-Mar-2026: 0.7.9 Build #310 (21813) Public Release"
    // We surface that to the UI so users know which patch the wiki data was
    // captured from. The file is small (~50KB) so re-reading on each /meta
    // call is cheap; /meta itself is only hit once at app boot.
    private static final Pattern VERSION_LINE = Pattern.compile(
            "^(\\d{1,2}-[A-Za-z]{3}-\\d{4}):\\s+(\\S+)\\s+Build\\s+#(\\d+)");

    private Map<String, String> parseGameVersion() {
        Path changelog = gameConfig.dataDirPath().getParent().resolve("changelog.txt");
        if (!Files.exists(changelog)) return null;
        try {
            for (String line : Files.readAllLines(changelog, StandardCharsets.UTF_8)) {
                Matcher m = VERSION_LINE.matcher(line.trim());
                if (m.find()) {
                    return Map.of(
                            "date", m.group(1),
                            "version", m.group(2),
                            "build", m.group(3)
                    );
                }
            }
        } catch (IOException ignored) {
            // Non-fatal: UI just hides the version badge when the field is absent.
        }
        return null;
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

    @GetMapping("/missions")
    public List<MissionSummary> missions(@RequestParam(defaultValue = "cn") String lang) {
        return missionService.list(resolveLang(lang));
    }

    @GetMapping("/mission/{folder}/{id}")
    public MissionDetail mission(@PathVariable String folder, @PathVariable String id,
                                  @RequestParam(defaultValue = "cn") String lang) {
        return missionService.detail(folder, id, resolveLang(lang));
    }

    @GetMapping("/campaigns")
    public List<CampaignSummary> campaigns(@RequestParam(defaultValue = "cn") String lang) {
        return campaignService.list(resolveLang(lang));
    }

    @GetMapping("/campaign/{id}")
    public CampaignDetail campaign(@PathVariable String id,
                                    @RequestParam(defaultValue = "cn") String lang) {
        return campaignService.detail(id, resolveLang(lang));
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
