// ---------- Sea Power offline encyclopedia ----------
const state = {
    category: "vessels",
    lang: "cn",
    all: [],          // current category summary list
    filtered: [],
    selectedId: null,
    nations: {},      // prefix -> display
    ammoNames: {},    // ammo id -> display name (preloaded once for ammo-link rendering)
};

const $ = sel => document.querySelector(sel);
const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
};

async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
}

// ----- Localization (cn-only) -----
// Variant slot keys ("Default" / "Variant3" / "Squadron2") are internal INI section
// names; turn them into reader-facing labels.
function localizeSlot(slot) {
    if (!slot) return "";
    if (slot === "Default") return "默认涂装";
    let m = slot.match(/^Variant(\d+)$/);
    if (m) return "涂装 " + m[1];
    m = slot.match(/^Squadron(\d+)$/);
    if (m) return "中队 " + m[1];
    return slot;
}

// Mapping from the canonical English label we get from UnitService.buildSpecs()
// to a Chinese display label. Keys not in the table fall back to the original.
const SPEC_LABEL_CN = {
    "Unit Type": "单位类型",
    "Length (m)": "长度 (m)",
    "Beam (m)": "宽度 (m)",
    "Armor": "装甲",
    "Damage Points": "生命值",
    "Sub Type": "子类型",
    "Display Class": "等级",
    "Size": "尺寸",
    "Displacement (t)": "排水量 (t)",
    "Max Speed (kn)": "最大航速 (kn)",
    "Max Reverse (kn)": "最大倒车速度 (kn)",
    "Propulsion": "动力类型",
    "Horsepower (hp)": "功率 (hp)",
    "RCS": "雷达截面积",
    "IR Signature": "红外特征",
    "Visual ID Range (nm)": "目视识别距离 (nm)",
    "Base Noise (dB)": "基础噪声 (dB)",
    "Wing Span (m)": "翼展 (m)",
    "Empty Mass (kg)": "空重 (kg)",
    "Max Fuel (kg)": "最大燃油 (kg)",
    "Thrust per Engine (N)": "单台推力 (N)",
    "Engine Count": "发动机数",
    "Ceiling (ft)": "升限 (ft)",
    "Cruise Altitude (ft)": "巡航高度 (ft)",
    "Max Speed SL (kn)": "海平面最大速度 (kn)",
    "Stall Speed (kn)": "失速速度 (kn)",
    "Mach Limit": "马赫极限",
    "Max Climb Rate (m/s)": "最大爬升率 (m/s)",
    "Max G": "最大过载",
    "Role": "战斗角色",
    "AAW Capability": "防空能力",
    "ASuW Capability": "反舰能力",
    "ASW Capability": "反潜能力",
    "Missiles to Saturate": "饱和所需导弹数",
    "Torpedoes to Saturate": "饱和所需鱼雷数",
    "Unit Cost": "单位价值",
    "Score Value": "评分价值"
};
function specLabel(en) { return SPEC_LABEL_CN[en] || en; }

// Priority order for ammunition stats — first 6 present fields go into the
// hero stats strip / click popover. Keys here must match AmmunitionService.detail()
// label keys exactly.
const AMMO_STAT_KEYS = [
    ["最大射程 (nm)",       "最大射程",     "nm"],
    ["最大速度 (kn)",       "最大速度",     "kn"],
    ["制导方式",           "制导方式",     ""],
    ["战斗部威力",         "战斗部威力",   ""],
    ["杀伤规模",           "杀伤规模",     ""],
    ["穿透",               "穿透",        ""],
    ["最高交战高度 (ft)",   "最高交战高度",  "ft"],
    ["最低交战高度 (ft)",   "最低交战高度",  "ft"],
    ["最大下潜深度 (ft)",   "最大下潜深度",  "ft"],
    ["战斗部类型",         "战斗部类型",   ""],
    ["中段修正",           "中段修正",     ""]
];

// ----- Init -----
async function init() {
    // Wire up controls
    document.querySelectorAll(".tab").forEach(btn => {
        btn.addEventListener("click", () => setCategory(btn.dataset.cat));
    });
    $("#lang").addEventListener("change", e => {
        state.lang = e.target.value;
        loadAmmoNames();
        reload();
    });
    $("#search").addEventListener("input", applyFilter);
    $("#filterNation").addEventListener("change", applyFilter);
    $("#filterType").addEventListener("change", applyFilter);
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") hideTooltip();
    });

    // Delegated click handler for ammo-link tooltips. Bound once on the body so
    // every current and future <a class="ammo-link"> picks it up — no per-render
    // attachment needed (and no chance of leaks when innerHTML is replaced).
    // Clicking the same link again, clicking outside, or pressing Escape closes it.
    document.body.addEventListener("click", e => {
        const link = e.target.closest && e.target.closest(".ammo-link[data-ammo]");
        if (link) {
            e.preventDefault();
            const isOpenForThisLink = tooltipTarget === link
                && tooltipEl && tooltipEl.classList.contains("visible");
            if (isOpenForThisLink) hideTooltip();
            else showAmmoTooltip(link, link.dataset.ammo);
            return;
        }
        if (tooltipEl && tooltipEl.classList.contains("visible")
            && !tooltipEl.contains(e.target)) {
            hideTooltip();
        }
    });

    try {
        const meta = await fetchJSON("/api/meta");
        $("#metaInfo").textContent = `// lang=${meta.defaultLanguage}`;
        $("#srcPath").textContent = meta.streamingAssets;
    } catch (e) { console.warn("meta failed", e); }

    try {
        state.nations = await fetchJSON("/api/nations");
    } catch (e) { console.warn("nations failed", e); }

    // Kick off ammo name preload in parallel — the first vessel detail render
    // needs this map to show "AIM-7M Sparrow" instead of "usn_aim-7m" in weapon rows.
    loadAmmoNames();

    await reload();
}

async function loadAmmoNames() {
    try {
        const list = await fetchJSON(`/api/ammunition?lang=${state.lang}`);
        const map = {};
        for (const a of list) {
            if (a && a.id) map[a.id] = a.name || a.id;
        }
        state.ammoNames = map;
        // Refresh any already-rendered ammo links so they pick up the resolved names.
        document.querySelectorAll(".ammo-link[data-ammo]").forEach(node => {
            const id = node.dataset.ammo;
            if (map[id]) node.textContent = map[id];
        });
    } catch (e) {
        console.warn("ammo names preload failed", e);
    }
}

function setCategory(cat) {
    if (state.category === cat) return;
    state.category = cat;
    state.selectedId = null;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    reload();
}

async function reload() {
    $("#list").innerHTML = `<div style="padding:14px;color:var(--text-faint);font-family:var(--mono)">加载中…</div>`;
    try {
        state.all = await fetchJSON(`/api/${state.category}?lang=${state.lang}`);
    } catch (e) {
        $("#list").innerHTML = `<div style="padding:14px;color:var(--danger)">错误: ${e.message}</div>`;
        return;
    }
    rebuildFilters();
    applyFilter();
}

function rebuildFilters() {
    // Nation filter
    const nationSel = $("#filterNation");
    const current = nationSel.value;
    nationSel.innerHTML = `<option value="">全部</option>`;
    const nations = new Set(state.all.map(u => u.nation).filter(Boolean));
    [...nations].sort().forEach(n => {
        const o = el("option"); o.value = n; o.textContent = n; nationSel.appendChild(o);
    });
    if ([...nations].includes(current)) nationSel.value = current;

    // Type filter
    const typeSel = $("#filterType");
    const currentT = typeSel.value;
    typeSel.innerHTML = `<option value="">全部</option>`;
    const types = new Set(state.all.map(u => u.type).filter(Boolean));
    [...types].sort().forEach(t => {
        const o = el("option"); o.value = t; o.textContent = t; typeSel.appendChild(o);
    });
    if ([...types].includes(currentT)) typeSel.value = currentT;
}

function applyFilter() {
    const q = $("#search").value.trim().toLowerCase();
    const n = $("#filterNation").value;
    const t = $("#filterType").value;
    state.filtered = state.all.filter(u => {
        if (n && u.nation !== n) return false;
        if (t && u.type !== t) return false;
        if (q) {
            const hay = `${u.id} ${u.name || ""} ${u.type || ""} ${u.nation || ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
    renderList();
}

function renderList() {
    const list = $("#list");
    list.innerHTML = "";
    $("#counter").textContent = `${state.filtered.length} / ${state.all.length} 条`;
    for (const u of state.filtered) {
        const row = el("div", "list-item");
        row.dataset.id = u.id;
        row.title = `${u.name || u.id}\n${u.nation || "?"} · ${u.id}`;
        if (u.id === state.selectedId) row.classList.add("selected");
        const badge = el("div", "badge", u.type || "—");
        const body = el("div", "body");
        body.appendChild(el("div", "name", u.name || u.id));
        const sub = el("div", "sub");
        const flag = flagTextureFor(u.nationPrefix);
        if (flag) {
            const img = document.createElement("img");
            img.className = "flag";
            img.src = `/api/image/${encodeURIComponent(flag)}.png`;
            img.loading = "lazy";
            img.onerror = () => img.remove();
            sub.appendChild(img);
        }
        sub.appendChild(document.createTextNode(`${u.nation || "?"} · ${u.id}`));
        body.appendChild(sub);
        row.appendChild(badge);
        row.appendChild(body);
        row.addEventListener("click", () => select(u.id));
        list.appendChild(row);
    }
}

// Map a nation prefix to a flag texture name. These are the known flag textures
// baked into the game's Texture2D pool.
function flagTextureFor(prefix) {
    if (!prefix) return null;
    const map = {
        usn: "flag_us", usaf: "flag_us",
        wp: "flag_soviet",
        rn: "flag_uk", raf: "flag_uk",
        jmsdf: "flag_japan", jsdaf: "flag_japan",
        plan: "flag_china", plaf: "flag_china",
        raan: "flag_australia", raaf: "flag_australia",
        rcn: "flag_canada", rcaf: "flag_canada",
        ir: "flag_iran",
        ins: "flag_israel", iaf: "flag_israel",
        civ: null, all: null
    };
    return map[prefix] || null;
}

async function select(id) {
    state.selectedId = id;
    document.querySelectorAll(".list-item").forEach(r => r.classList.toggle("selected", r.dataset.id === id));
    const detailPath = detailEndpoint(state.category);
    const detail = $("#detail");
    detail.innerHTML = `<div class="placeholder"><div class="placeholder-grid"></div><div class="placeholder-text"><p class="op">[ 获取中 ]</p></div></div>`;
    try {
        const data = await fetchJSON(`/api/${detailPath}/${id}?lang=${state.lang}`);
        if (state.category === "ammunition") renderAmmo(data);
        else renderUnit(data);
    } catch (e) {
        detail.innerHTML = `<div style="color:var(--danger);padding:20px">错误: ${e.message}</div>`;
    }
}

function detailEndpoint(cat) {
    return {
        vessels: "vessel",
        aircraft: "aircraft",
        land_units: "land_unit",
        ammunition: "ammo"
    }[cat];
}

// ---------- Render: Unit (vessel/aircraft/land_unit) ----------
// Redesigned layout:
//   1. HERO (image + title/type/nation/role badges)
//   2. STATS STRIP (5-6 key stats as big numbers)
//   3. DESCRIPTION block
//   4. TWO-COLUMN: Armament (weapons + magazines fused) | Sensors
//   5. VARIANTS grid (cards, not table)
//   6. AIR GROUP (if present)
//   7. Collapsibles: Full Specs + Raw INI
function renderUnit(u) {
    const detail = $("#detail");
    detail.innerHTML = "";
    const inner = el("div", "detail-inner");
    detail.appendChild(inner);

    // --- 1. HERO ---
    inner.appendChild(renderHero(u));

    // --- 2. STATS STRIP ---
    const keyStats = pickKeyStats(u);
    if (keyStats.length) inner.appendChild(renderStatsStrip(keyStats));

    // --- Body sections ---
    const body = el("div", "body-sections");
    inner.appendChild(body);

    // --- 3. DESCRIPTION ---
    if (u.description) {
        const desc = el("div", "description-block");
        desc.textContent = u.description;
        body.appendChild(desc);
    }

    // --- 4. ARMAMENT + SENSORS (two columns) ---
    const hasWeapons = u.weapons && u.weapons.length;
    const hasSensors = u.sensors && u.sensors.length;
    if (hasWeapons || hasSensors) {
        const row = el("div", "twocol");
        if (hasWeapons) row.appendChild(renderArmament(u));
        if (hasSensors) row.appendChild(renderSensors(u));
        body.appendChild(row);
    }

    // --- 5. VARIANTS ---
    if (u.variants && u.variants.length) {
        body.appendChild(renderVariants(u));
    }

    // --- 6. AIR GROUP ---
    if (u.airGroup && Object.keys(u.airGroup).length) {
        body.appendChild(renderAirGroup(u));
    }

    // --- 7. Collapsibles ---
    if (u.specs && Object.keys(u.specs).length) {
        body.appendChild(renderFullSpecs(u));
    }
    body.appendChild(rawDetails(u.raw));

    // Ammo-link click popovers are handled via global delegation in init() — no
    // per-element binding needed here.
}

// ---------- Hero banner ----------
function renderHero(u) {
    const hero = el("div", "hero");
    const heroName = (u.images && u.images.primary) || u.id;

    const imgWrap = el("div", "hero-img-wrap");
    const img = document.createElement("img");
    img.src = `/api/image/${encodeURIComponent(heroName)}.png`;
    img.alt = heroName;
    img.loading = "lazy";
    img.onerror = () => {
        hero.classList.add("placeholder");
        imgWrap.innerHTML = "[ 暂无图像 ]";
    };
    imgWrap.appendChild(img);
    hero.appendChild(imgWrap);

    const info = el("div", "hero-info");
    const labelTxt = u.type || u.category.toUpperCase();
    info.appendChild(el("div", "hero-label", labelTxt));
    info.appendChild(el("h1", "hero-name", u.name || u.id));

    const subBits = [u.nation || "—"];
    if (u.role) subBits.push(u.role);
    const year = firstServiceYear(u);
    if (year) subBits.push(year);
    info.appendChild(el("div", "hero-sub", subBits.join("  ·  ")));

    // Badges: flag chip + role chip
    const badges = el("div", "hero-badges");
    const flagName = (u.images && u.images.flag) || null;
    if (flagName) {
        const chip = el("div", "badge-chip");
        const f = document.createElement("img");
        f.src = `/api/image/${encodeURIComponent(flagName)}.png`;
        f.alt = flagName;
        f.onerror = () => f.remove();
        chip.appendChild(f);
        chip.appendChild(document.createTextNode(u.nation || ""));
        badges.appendChild(chip);
    }
    const armor = specFrom(u.specs, ["Armor"]);
    if (armor) {
        const c = el("div", "badge-chip", `ARMOR · ${armor}`);
        badges.appendChild(c);
    }
    const rcs = specFrom(u.specs, ["RCS"]);
    if (rcs) {
        const c = el("div", "badge-chip", `RCS · ${rcs}`);
        badges.appendChild(c);
    }
    if (badges.children.length) info.appendChild(badges);

    hero.appendChild(info);

    const idTag = el("div", "hero-meta-id", u.id.toUpperCase());
    hero.appendChild(idTag);

    return hero;
}

// ---------- Stats strip ----------
function pickKeyStats(u) {
    const s = u.specs || {};
    // Choose 4-6 headline stats based on category.
    const want = {
        vessels: [
            ["Length (m)", "长度", "m"],
            ["Displacement (t)", "排水量", "t"],
            ["Max Speed (kn)", "最大航速", "kn"],
            ["Horsepower (hp)", "功率", "hp"],
            ["AAW Capability", "防空指数", ""],
            ["ASW Capability", "反潜指数", ""]
        ],
        aircraft: [
            ["Wing Span (m)", "翼展", "m"],
            ["Max Speed SL (kn)", "最大平飞速度", "kn"],
            ["Mach Limit", "马赫极限", ""],
            ["Ceiling (ft)", "升限", "ft"],
            ["Max Climb Rate (m/s)", "爬升率", "m/s"],
            ["Engine Count", "发动机数", ""]
        ],
        land_units: [
            ["Sub Type", "类别", ""],
            ["Damage Points", "生命值", ""],
            ["Visual ID Range (nm)", "识别距离", "nm"],
            ["RCS", "雷达反射", ""],
            ["IR Signature", "红外特征", ""]
        ]
    }[u.category] || [];

    const out = [];
    for (const [key, label, unit] of want) {
        const v = s[key];
        if (v === undefined || v === null || v === "") continue;
        out.push({ label, value: String(v), unit });
        if (out.length >= 6) break;
    }
    return out;
}

function renderStatsStrip(stats) {
    const strip = el("div", "stats-strip");
    for (const st of stats) {
        const c = el("div", "stat-card");
        c.appendChild(el("div", "label", st.label));
        const v = el("div", "value");
        v.textContent = st.value;
        if (st.unit) {
            const u = el("span", "unit", st.unit);
            v.appendChild(u);
        }
        c.appendChild(v);
        strip.appendChild(c);
    }
    return strip;
}

// ---------- Armament (weapons + magazines fused) ----------
function renderArmament(u) {
    const section = makeSection("武装系统", (u.weapons || []).length + " 个挂点");
    const body = section.querySelector(".section-body");

    // Group weapons by loadout
    const byLoadout = new Map();
    for (const w of u.weapons || []) {
        const k = w.loadout || "Default";
        if (!byLoadout.has(k)) byLoadout.set(k, []);
        byLoadout.get(k).push(w);
    }
    const wlist = el("div", "wsys-list");
    const magLookup = new Map((u.magazines || []).map(m => [m.name, m]));

    for (const [loadout, wps] of byLoadout) {
        // Collapse duplicate system names to show counts (e.g., 2× MK26)
        const grouped = new Map();
        for (const w of wps) {
            const key = (w.type || "") + "|" + (w.systemName || "") + "|" + (w.ammunitionId || "") + "|" + (w.magazineRef || "");
            if (!grouped.has(key)) grouped.set(key, { w, count: 0 });
            grouped.get(key).count++;
        }
        for (const { w, count } of grouped.values()) {
            const row = el("div", "wsys-row");
            const typeClass = (w.type || "").toLowerCase();
            row.innerHTML = `
                <div class="w-type ${typeClass}">${escape(w.type || "—")}</div>
                <div class="w-name">${count > 1 ? count + "× " : ""}${escape(w.systemName || "—")}
                    ${loadout !== "Default" ? `<span class="w-loadout">[${escape(loadout)}]</span>` : ""}</div>
                <div class="w-ammo">${renderWeaponAmmo(w, magLookup)}</div>`;
            wlist.appendChild(row);
        }
    }
    body.appendChild(wlist);

    return section;
}

function renderWeaponAmmo(w, magLookup) {
    if (w.ammunitionId) return ammoLink(w.ammunitionId);
    if (w.magazineRef) {
        const m = magLookup.get(w.magazineRef);
        if (m && m.contents && m.contents.length) {
            return m.contents.map(c =>
                `${ammoLink(c.ammoId)}<span class="count" style="color:var(--accent);margin-left:4px">×${c.count}</span>`
            ).join(" · ");
        }
        return `<span style="color:var(--text-faint)">→ ${escape(w.magazineRef)}</span>`;
    }
    return "<span style='color:var(--text-faint)'>—</span>";
}

// ---------- Sensors ----------
function renderSensors(u) {
    const section = makeSection("传感器 / 电子", (u.sensors || []).length + " 套");
    const body = section.querySelector(".section-body");
    const list = el("div", "sensor-list");
    // Group by systemName to collapse duplicates
    const grouped = new Map();
    for (const s of u.sensors) {
        const key = (s.type || "") + "|" + (s.systemName || "");
        if (!grouped.has(key)) grouped.set(key, { s, count: 0 });
        grouped.get(key).count++;
    }
    for (const { s, count } of grouped.values()) {
        const row = el("div", "sensor-row");
        row.innerHTML = `
            <div class="s-type">${escape(s.type || "")}</div>
            <div class="s-name">${count > 1 ? count + "× " : ""}${escape(s.systemName || "—")}</div>`;
        list.appendChild(row);
    }
    body.appendChild(list);
    return section;
}

// ---------- Variants ----------
function renderVariants(u) {
    const section = makeSection("型号 / 涂装", u.variants.length);
    const body = section.querySelector(".section-body");
    const grid = el("div", "variant-grid");
    for (const v of u.variants) {
        const card = el("div", "variant-card");
        const titleParts = [v.displayName || v.shortName || localizeSlot(v.slot)];
        if (v.slot) titleParts.push(`槽位: ${v.slot}`);
        if (v.nation) titleParts.push(v.nation);
        if (v.serviceDate) titleParts.push(v.serviceDate.replace("|", " – "));
        card.title = titleParts.join("\n");
        const thumbs = el("div", "thumbs");
        if (v.emblemTexture) thumbs.appendChild(thumbImg(v.emblemTexture, "emblem-thumb"));
        if (v.hullnumberTexture) thumbs.appendChild(thumbImg(v.hullnumberTexture, "hull-thumb"));
        if (v.flagTexture) thumbs.appendChild(thumbImg(v.flagTexture, "flag-thumb"));
        if (thumbs.children.length) card.appendChild(thumbs);
        const b = el("div", "v-body");
        b.appendChild(el("div", "v-slot", localizeSlot(v.slot)));
        b.appendChild(el("div", "v-name", v.displayName || v.shortName || localizeSlot(v.slot)));
        const meta = [];
        if (v.nation) meta.push(v.nation);
        if (v.serviceDate) meta.push(v.serviceDate.replace("|", " – "));
        if (meta.length) b.appendChild(el("div", "v-meta", meta.join("  ·  ")));
        if (v.notes) b.appendChild(el("div", "v-notes", v.notes));
        card.appendChild(b);
        grid.appendChild(card);
    }
    body.appendChild(grid);
    return section;
}

function thumbImg(name, cls) {
    const i = document.createElement("img");
    i.src = `/api/image/${encodeURIComponent(name)}.png`;
    i.alt = name;
    i.className = cls;
    i.loading = "lazy";
    i.onerror = () => i.remove();
    return i;
}

// ---------- Air group ----------
function renderAirGroup(u) {
    const section = makeSection("搭载机队", Object.keys(u.airGroup).length);
    const body = section.querySelector(".section-body");
    const list = el("div", "airgroup-list");
    for (const [k, v] of Object.entries(u.airGroup)) {
        const row = el("div", "airgroup-row");
        row.innerHTML = `<span class="ag-name">${escape(k)}</span><span class="ag-count">${escape(v)}</span>`;
        list.appendChild(row);
    }
    body.appendChild(list);
    return section;
}

// ---------- Full specs (collapsible) ----------
function renderFullSpecs(u) {
    const d = document.createElement("details");
    d.className = "raw";
    const s = el("summary", null, `完整参数  ·  共 ${Object.keys(u.specs).length} 项`);
    d.appendChild(s);
    const g = el("div", "specs-grid");
    g.style.padding = "12px";
    for (const [k, v] of Object.entries(u.specs)) {
        const it = el("div", "spec");
        it.appendChild(el("div", "k", specLabel(k)));
        it.appendChild(el("div", "v", v));
        g.appendChild(it);
    }
    d.appendChild(g);
    return d;
}

// ---------- Utilities ----------
function makeSection(title, count) {
    const s = el("div", "section");
    const head = el("div", "section-head");
    head.innerHTML = `<h3>${escape(title)}</h3>${count !== undefined ? `<div class="count">${escape(String(count))}</div>` : ""}`;
    s.appendChild(head);
    s.appendChild(el("div", "section-body"));
    return s;
}

function specFrom(specs, keys) {
    if (!specs) return null;
    for (const k of keys) if (specs[k]) return specs[k];
    return null;
}

function firstServiceYear(u) {
    if (!u.variants) return null;
    for (const v of u.variants) {
        if (v.serviceDate) return v.serviceDate.replace("|", " – ");
    }
    return null;
}

// ---------- Render: Ammunition ----------
function renderAmmo(a) {
    const detail = $("#detail");
    detail.innerHTML = "";
    const inner = el("div", "detail-inner");
    detail.appendChild(inner);

    // Hero — try texture named after the ammo id (e.g. usn_rgm-84c may have a side-view render)
    const hero = el("div", "hero");
    const imgWrap = el("div", "hero-img-wrap");
    const img = document.createElement("img");
    img.src = `/api/image/${encodeURIComponent(a.id)}.png`;
    img.alt = a.id;
    img.loading = "lazy";
    img.onerror = () => {
        hero.classList.add("placeholder");
        imgWrap.innerHTML = "[ 暂无图像 ]";
    };
    imgWrap.appendChild(img);
    hero.appendChild(imgWrap);

    const info = el("div", "hero-info");
    if (a.category) info.appendChild(el("div", "hero-label", a.category));
    const displayName = a.codename && a.codename !== a.name ? `${a.name || a.id}  “${a.codename}”` : (a.name || a.id);
    info.appendChild(el("h1", "hero-name", displayName));
    const subBits = [a.nation || "—"];
    if (a.type) subBits.push(a.type);
    if (a.targetType) subBits.push(a.targetType);
    info.appendChild(el("div", "hero-sub", subBits.join("  ·  ")));
    hero.appendChild(info);
    hero.appendChild(el("div", "hero-meta-id", a.id.toUpperCase()));
    inner.appendChild(hero);

    // Stats strip — pick the most useful 6 stats present in this ammo's data.
    if (a.specs) {
        const order = AMMO_STAT_KEYS;
        const out = [];
        for (const [key, label, unit] of order) {
            const v = a.specs[key];
            if (v === undefined || v === null || v === "") continue;
            out.push({ label, value: String(v), unit });
            if (out.length >= 6) break;
        }
        if (out.length) inner.appendChild(renderStatsStrip(out));
    }

    const body = el("div", "body-sections");
    inner.appendChild(body);

    if (a.description) {
        const d = el("div", "description-block");
        d.textContent = a.description;
        body.appendChild(d);
    }
    if (a.specs && Object.keys(a.specs).length) {
        body.appendChild(renderFullSpecs(a));
    }
    body.appendChild(rawDetails(a.raw));
}

// ---------- Ammo click popover ----------
const ammoCache = new Map();          // id → fetched detail (or pending Promise)
let tooltipEl = null;
let tooltipTarget = null;             // which ammo-link the popover is currently attached to

function ensureTooltipEl() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = el("div", "ammo-tooltip");
    document.body.appendChild(tooltipEl);
    return tooltipEl;
}

function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove("visible");
    tooltipTarget = null;
}

async function showAmmoTooltip(anchor, id) {
    tooltipTarget = anchor;
    const tip = ensureTooltipEl();
    tip.classList.add("visible");
    if (!ammoCache.has(id)) {
        tip.innerHTML = `<div class="ammo-tip-loading">加载中…</div>`;
        positionTooltip(anchor);
        const promise = fetchJSON(`/api/ammo/${encodeURIComponent(id)}?lang=${state.lang}`)
            .catch(e => ({ error: String(e) }));
        ammoCache.set(id, promise);
    }
    const data = await ammoCache.get(id);
    if (tooltipTarget !== anchor) return;            // user moved away while loading
    ammoCache.set(id, data);                          // resolve cache to actual data
    if (data && data.error) {
        tip.innerHTML = `<div class="ammo-tip-loading">加载失败: ${escape(data.error)}</div>`;
    } else {
        tip.innerHTML = "";
        tip.appendChild(buildAmmoTooltipBody(data));
    }
    positionTooltip(anchor);
}

function buildAmmoTooltipBody(a) {
    const wrap = el("div", "ammo-tip");

    // Header line: name (+ codename) + type/target chips
    const head = el("div", "ammo-tip-head");
    const name = a.codename && a.codename !== a.name
        ? `${a.name || a.id} “${a.codename}”`
        : (a.name || a.id);
    head.appendChild(el("div", "ammo-tip-name", name));
    const chips = el("div", "ammo-tip-chips");
    if (a.category) chips.appendChild(el("span", "ammo-tip-chip accent", a.category));
    if (a.type) chips.appendChild(el("span", "ammo-tip-chip", a.type));
    if (a.targetType) chips.appendChild(el("span", "ammo-tip-chip warn", a.targetType));
    if (a.nation) chips.appendChild(el("span", "ammo-tip-chip", a.nation));
    if (chips.children.length) head.appendChild(chips);
    wrap.appendChild(head);

    // Compact stat grid (up to 6 items)
    if (a.specs) {
        const grid = el("div", "ammo-tip-grid");
        let n = 0;
        for (const [key, label, unit] of AMMO_STAT_KEYS) {
            const v = a.specs[key];
            if (v === undefined || v === null || v === "") continue;
            const cell = el("div", "ammo-tip-cell");
            cell.appendChild(el("div", "ammo-tip-k", label));
            const valueEl = el("div", "ammo-tip-v");
            valueEl.textContent = v;
            if (unit) {
                const u = el("span", "ammo-tip-u", " " + unit);
                valueEl.appendChild(u);
            }
            cell.appendChild(valueEl);
            grid.appendChild(cell);
            if (++n >= 6) break;
        }
        if (n) wrap.appendChild(grid);
    }

    // Description (truncated to keep tooltip compact)
    if (a.description) {
        const d = el("div", "ammo-tip-desc");
        const txt = a.description.length > 200 ? a.description.slice(0, 200) + "…" : a.description;
        d.textContent = txt;
        wrap.appendChild(d);
    }

    return wrap;
}

function positionTooltip(anchor) {
    const tip = tooltipEl;
    if (!tip) return;
    const r = anchor.getBoundingClientRect();
    // Measure after content set
    tip.style.left = "0px";
    tip.style.top = "0px";
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const margin = 8;
    let left = r.right + margin;
    let top = r.top;
    // Flip to left if overflow on right
    if (left + tw > window.innerWidth - margin) {
        left = Math.max(margin, r.left - tw - margin);
    }
    // Clamp vertically
    if (top + th > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - th - margin);
    if (top < margin) top = margin;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
}


// ---------- Helpers ----------
function rawDetails(raw) {
    const d = el("details", "raw");
    d.appendChild(el("summary", null, "原始 INI 数据(展开查看)"));
    const pre = el("pre");
    pre.textContent = formatRaw(raw);
    d.appendChild(pre);
    return d;
}

function formatRaw(raw) {
    if (!raw) return "";
    const lines = [];
    for (const [section, kv] of Object.entries(raw)) {
        lines.push(`[${section}]`);
        for (const [k, v] of Object.entries(kv)) {
            lines.push(`${k} = ${v}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

function ammoLink(id) {
    const display = state.ammoNames[id] || id;
    return `<a class="ammo-link" data-ammo="${escape(id)}">${escape(display)}</a>`;
}

function escape(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[c]));
}

init();
