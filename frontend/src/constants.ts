// Display tables shared across components.

import type { Category, Domain } from './types';

// English spec label → Chinese display label. Keys come from
// UnitService.buildSpecs() in the backend; values are user-facing.
export const SPEC_LABEL_CN: Record<string, string> = {
  'Unit Type': '单位类型',
  'Length (m)': '长度 (m)',
  'Beam (m)': '宽度 (m)',
  Armor: '装甲',
  'Damage Points': '生命值',
  'Sub Type': '子类型',
  'Display Class': '等级',
  Size: '尺寸',
  'Displacement (t)': '排水量 (t)',
  'Max Speed (kn)': '最大航速 (kn)',
  'Max Reverse (kn)': '最大倒车速度 (kn)',
  Propulsion: '动力类型',
  'Horsepower (hp)': '功率 (hp)',
  RCS: '雷达截面积',
  'IR Signature': '红外特征',
  'Visual ID Range (nm)': '目视识别距离 (nm)',
  'Base Noise (dB)': '基础噪声 (dB)',
  'Wing Span (m)': '翼展 (m)',
  'Empty Mass (kg)': '空重 (kg)',
  'Max Fuel (kg)': '最大燃油 (kg)',
  'Thrust per Engine (N)': '单台推力 (N)',
  'Cruise Altitude (ft)': '巡航高度 (ft)',
  'Ceiling (ft)': '升限 (ft)',
  'Cruise Range (nm)': '巡航航程 (nm)',
  'Max Speed SL (kn)': '海平面最大速度 (kn)',
  'Stall Speed (kn)': '失速速度 (kn)',
  'Mach Limit': '马赫极限',
  'Max Climb Rate (m/s)': '最大爬升率 (m/s)',
  'Max G': '最大过载',
  Role: '战斗角色',
  'AAW Capability': '防空能力',
  'ASuW Capability': '反舰能力',
  'ASW Capability': '反潜能力',
  'Missiles to Saturate': '饱和所需导弹数',
  'Torpedoes to Saturate': '饱和所需鱼雷数',
  'Unit Cost': '单位价值',
  'Score Value': '评分价值',
};

export function specLabel(en: string): string {
  return SPEC_LABEL_CN[en] || en;
}

// Hover tooltips for jargon labels — currently the AAW / ASuW / ASW trio whose
// translated names (防空 / 反舰 / 反潜) lose the original NATO abbreviation.
// Keys mirror SPEC_LABEL_CN so the hint can be looked up in either hero stats
// or the full-spec sheet.
const SPEC_HINTS: Record<string, string> = {
  'AAW Capability': 'AAW = Anti-Air Warfare（对空作战指数）',
  'ASuW Capability': 'ASuW = Anti-Surface Warfare（反水面舰艇作战指数）',
  'ASW Capability': 'ASW = Anti-Submarine Warfare（反潜作战指数）',
};

// Aircraft AI Role tokens (the [AI].Role field, e.g. "Fighter" / "ASW,MPA").
// Each value can be a comma-separated combo; we expand every token so a
// "MPA,ASW,SAR" tooltip reads "MPA = 海上巡逻 · ASW = 反潜 · SAR = 搜救".
const ROLE_HINTS: Record<string, string> = {
  Fighter:      'Fighter = 战斗机',
  Bomber:       'Bomber = 轰炸机',
  HeavyBomber:  'HeavyBomber = 重型轰炸机',
  Attack:       'Attack = 攻击机',
  Recon:        'Recon = 侦察机',
  Transport:    'Transport = 运输机',
  Airliner:     'Airliner = 民用客机',
  AEW:          'AEW = Airborne Early Warning（空中预警机）',
  ASW:          'ASW = Anti-Submarine Warfare（反潜作战）',
  ASuW:         'ASuW = Anti-Surface Warfare（反水面舰艇作战）',
  MPA:          'MPA = Maritime Patrol Aircraft（海上巡逻机）',
  ESM:          'ESM = Electronic Support Measures（电子情报支援）',
  EW:           'EW = Electronic Warfare（电子战）',
  SEAD:         'SEAD = Suppression of Enemy Air Defenses（敌防空压制）',
  SAR:          'SAR = Search And Rescue（搜救）',
  Targeting:    'Targeting = 目标指示',
};

function roleHint(raw: string): string | undefined {
  const tokens = raw.split(/[,\s/]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const parts = tokens
    .map((t) => ROLE_HINTS[t])
    .filter((s): s is string => !!s);
  if (parts.length === 0) return undefined;
  return parts.join(' · ');
}

// Vessel hull/type abbreviations — NATO/US classes + Soviet classes + a few
// civilian markers. Used in the hero label tooltip so the cryptic short
// (e.g. "TARKR", "DDG") expands to its full meaning.
const VESSEL_TYPE_HINTS: Record<string, string> = {
  // ----- US / NATO -----
  AE:    'AE = Ammunition Ship（弹药补给舰）',
  AGI:   'AGI = Auxiliary General Intelligence（情报收集船）',
  AOE:   'AOE = Fast Combat Support Ship（快速战斗支援舰）',
  APA:   'APA = Attack Transport（攻击运输舰）',
  BB:    'BB = Battleship（战列舰）',
  CG:    'CG = Guided Missile Cruiser（导弹巡洋舰）',
  CGN:   'CGN = Nuclear Guided Missile Cruiser（核动力导弹巡洋舰）',
  CLG:   'CLG = Light Guided Missile Cruiser（轻型导弹巡洋舰）',
  CV:    'CV = Aircraft Carrier（航空母舰）',
  CVL:   'CVL = Light Aircraft Carrier（轻型航母）',
  CVN:   'CVN = Nuclear-powered Aircraft Carrier（核动力航母）',
  DD:    'DD = Destroyer（驱逐舰）',
  DDG:   'DDG = Guided Missile Destroyer（导弹驱逐舰）',
  DDH:   'DDH = Helicopter Destroyer（直升机驱逐舰）',
  DE:    'DE = Destroyer Escort（护航驱逐舰）',
  DLG:   'DLG = Guided Missile Frigate / 老式导弹护卫舰',
  FF:    'FF = Frigate（护卫舰）',
  FFG:   'FFG = Guided Missile Frigate（导弹护卫舰）',
  FS:    'FS = Corvette（轻型护卫舰）',
  LHA:   'LHA = Amphibious Assault Ship（两栖攻击舰）',
  LKA:   'LKA = Amphibious Cargo Ship（两栖货运舰）',
  LPD:   'LPD = Landing Platform Dock（船坞登陆舰）',
  LSM:   'LSM = Medium Landing Ship（中型登陆舰）',
  LST:   'LST = Tank Landing Ship（坦克登陆舰）',
  M:     'M = Mine Warfare Ship（扫雷舰）',
  MSC:   'MSC = Coastal Minesweeper（近岸扫雷艇）',
  MSO:   'MSO = Ocean Minesweeper（远洋扫雷舰）',
  PB:    'PB = Patrol Boat（巡逻艇）',
  PF:    'PF = Patrol Frigate（巡逻护卫舰）',
  PT:    'PT = Patrol Torpedo Boat（鱼雷艇）',
  PTG:   'PTG = Patrol Torpedo Guided（导弹巡逻艇）',
  SS:    'SS = Submarine（常规潜艇）',
  SSBN:  'SSBN = Ballistic Missile Submarine, Nuclear（弹道导弹核潜艇）',
  SSG:   'SSG = Guided Missile Submarine（巡航导弹潜艇）',
  SSGN:  'SSGN = Guided Missile Submarine, Nuclear（核动力巡航导弹潜艇）',
  SSN:   'SSN = Attack Submarine, Nuclear（攻击核潜艇）',
  'T-AKR': 'T-AKR = Vehicle Cargo Ship（民用滚装运输船）',
  VT:    'VT = Vessel Tanker / Auxiliary Tanker（油轮 / 辅助舰）',
  // ----- Soviet (transliterations + Russian originals) -----
  BDK:   'BDK = Большой десантный корабль（大型登陆舰）',
  BPK:   'BPK = Большой противолодочный корабль（大型反潜舰）',
  EM:    'EM = Эскадренный миноносец（苏式驱逐舰）',
  KR:    'KR = Крейсер（苏式巡洋舰）',
  MPK:   'MPK = Малый противолодочный корабль（小型反潜舰）',
  MRK:   'MRK = Малый ракетный корабль（小型导弹舰）',
  PKR:   'PKR = Противолодочный крейсер（反潜巡洋舰 / 载机巡洋舰）',
  RKR:   'RKR = Ракетный крейсер（导弹巡洋舰）',
  SKR:   'SKR = Сторожевой корабль（护卫舰）',
  TARKR: 'TARKR = Тяжёлый атомный ракетный крейсер（重型核动力导弹巡洋舰）',
  TAVKR: 'TAVKR = Тяжёлый авианесущий крейсер（重型载机巡洋舰）',
  // ----- Civilian / misc -----
  FAB:   'FAB = Fast Attack Boat（快速攻击艇）',
  FAC:   'FAC = Fast Attack Craft（快速攻击艇）',
  FV:    'FV = Fishing Vessel（渔船）',
  MS:    'MS = Merchant Ship（商船）',
  MV:    'MV = Motor Vessel（民用机动船）',
  SEPTAR: 'SEPTAR = Swedish Naval Target（瑞典海军靶船）',
};

export function typeHint(short: string | null | undefined): string | undefined {
  if (!short) return undefined;
  return VESSEL_TYPE_HINTS[short.trim()];
}

// Land-unit subtype tokens (the [General].LandUnitSubType field). Game enum:
// Airbase / SAM / Installation / MobileUnit / Radar / Port / OilRig / AAA /
// MissileSite. Hint reads "<English> = <Chinese>" so users can decode the tag
// without learning the convention.
const SUBTYPE_HINTS: Record<string, string> = {
  AAA:          'AAA = Anti-Aircraft Artillery（高射炮）',
  Airbase:      'Airbase = 机场 / 航空基地',
  Installation: 'Installation = 固定军事设施',
  MissileSite:  'MissileSite = 导弹阵地',
  MobileUnit:   'MobileUnit = 机动部队（车辆 / 步兵）',
  OilRig:       'OilRig = 海上钻井平台',
  Port:         'Port = 港口设施',
  Radar:        'Radar = 雷达站',
  SAM:          'SAM = Surface-to-Air Missile（地对空导弹阵地）',
};

export function specHint(key: string, value?: string): string | undefined {
  if (key === 'Role' && value) {
    const dyn = roleHint(value);
    if (dyn) return dyn;
  }
  if (key === 'Sub Type' && value) {
    return SUBTYPE_HINTS[value];
  }
  return SPEC_HINTS[key];
}

// Section grouping for the "完整参数" panel. Keys map to one of these buckets;
// anything not mapped sinks to "其他".
export type SpecGroup =
  | 'identity'
  | 'dimensions'
  | 'propulsion'
  | 'performance'
  | 'signatures'
  | 'tactical'
  | 'other';

export const SPEC_GROUP_ORDER: SpecGroup[] = [
  'identity',
  'dimensions',
  'propulsion',
  'performance',
  'signatures',
  'tactical',
  'other',
];

export const SPEC_GROUP_LABEL: Record<SpecGroup, string> = {
  identity: '标识',
  dimensions: '尺寸 / 重量',
  propulsion: '动力',
  performance: '性能',
  signatures: '雷达 / 信号特征',
  tactical: '战术评估',
  other: '其他',
};

const SPEC_GROUP_BY_KEY: Record<string, SpecGroup> = {
  'Unit Type': 'identity',
  'Sub Type': 'identity',
  'Display Class': 'identity',
  Size: 'identity',
  'Damage Points': 'identity',
  Armor: 'identity',
  'Length (m)': 'dimensions',
  'Beam (m)': 'dimensions',
  'Wing Span (m)': 'dimensions',
  'Empty Mass (kg)': 'dimensions',
  'Max Fuel (kg)': 'dimensions',
  'Displacement (t)': 'dimensions',
  Propulsion: 'propulsion',
  'Horsepower (hp)': 'propulsion',
  'Thrust per Engine (N)': 'propulsion',
  'Max Speed (kn)': 'performance',
  'Max Reverse (kn)': 'performance',
  'Cruise Altitude (ft)': 'performance',
  'Ceiling (ft)': 'performance',
  'Cruise Range (nm)': 'performance',
  'Max Speed SL (kn)': 'performance',
  'Stall Speed (kn)': 'performance',
  'Mach Limit': 'performance',
  'Max Climb Rate (m/s)': 'performance',
  'Max G': 'performance',
  RCS: 'signatures',
  'IR Signature': 'signatures',
  'Visual ID Range (nm)': 'signatures',
  'Base Noise (dB)': 'signatures',
  Role: 'tactical',
  'AAW Capability': 'tactical',
  'ASuW Capability': 'tactical',
  'ASW Capability': 'tactical',
  'Missiles to Saturate': 'tactical',
  'Torpedoes to Saturate': 'tactical',
  'Unit Cost': 'tactical',
  'Score Value': 'tactical',
};

export function specGroup(key: string): SpecGroup {
  return SPEC_GROUP_BY_KEY[key] || 'other';
}

// Priority order for ammunition stats — first 6 present fields go into the
// hero stats strip / click popover. Tuple = [specKey, displayLabel, unit].
export const AMMO_STAT_KEYS: Array<[string, string, string]> = [
  ['最大射程 (nm)', '最大射程', 'nm'],
  ['最大速度 (kn)', '最大速度', 'kn'],
  ['目标类型', '目标类型', ''],
  ['制导方式', '制导方式', ''],
  ['战斗部威力', '战斗部威力', ''],
  ['杀伤规模', '杀伤规模', ''],
  ['穿透', '穿透', ''],
  ['最高交战高度 (ft)', '最高交战高度', 'ft'],
  ['最低交战高度 (ft)', '最低交战高度', 'ft'],
  ['最大下潜深度 (ft)', '最大下潜深度', 'ft'],
  ['战斗部类型', '战斗部类型', ''],
  ['中段修正', '中段修正', ''],
];

// Per-category headline stats for the hero stats strip. Tuple = [specKey, label, unit].
export const KEY_STATS_BY_CATEGORY: Record<string, Array<[string, string, string]>> = {
  vessels: [
    ['Length (m)', '长度', 'm'],
    ['Displacement (t)', '排水量', 't'],
    ['Max Speed (kn)', '最大航速', 'kn'],
    ['AAW Capability', '防空指数', ''],
    ['ASuW Capability', '反舰指数', ''],
    ['ASW Capability', '反潜指数', ''],
  ],
  aircraft: [
    ['Role', '战斗角色', ''],
    ['Max Speed SL (kn)', '最大平飞速度', 'kn'],
    ['Mach Limit', '马赫极限', ''],
    ['Ceiling (ft)', '升限', 'ft'],
    ['Max Climb Rate (m/s)', '爬升率', 'm/s'],
    ['Cruise Range (nm)', '巡航航程', 'nm'],
  ],
  land_units: [
    ['Sub Type', '类别', ''],
    ['Damage Points', '生命值', ''],
    ['Visual ID Range (nm)', '识别距离', 'nm'],
    ['RCS', '雷达反射', ''],
    ['IR Signature', '红外特征', ''],
  ],
};

// Map a unit's nation prefix to a known flag texture in the game's Texture2D pool.
const FLAG_BY_PREFIX: Record<string, string | null> = {
  usn: 'flag_us',
  usaf: 'flag_us',
  wp: 'flag_soviet',
  rn: 'flag_uk',
  raf: 'flag_uk',
  jmsdf: 'flag_japan',
  jsdaf: 'flag_japan',
  plan: 'flag_china',
  plaf: 'flag_china',
  raan: 'flag_australia',
  raaf: 'flag_australia',
  rcn: 'flag_canada',
  rcaf: 'flag_canada',
  ir: 'flag_iran',
  ins: 'flag_israel',
  iaf: 'flag_israel',
  civ: null,
  all: null,
};

export function flagTextureFor(prefix: string | null | undefined): string | null {
  if (!prefix) return null;
  return FLAG_BY_PREFIX[prefix] ?? null;
}

// User-facing labels for variant slot names ("Default" / "Variant3" / "Squadron2").
export function localizeSlot(slot: string | null | undefined): string {
  if (!slot) return '';
  if (slot === 'Default') return '默认涂装';
  const v = slot.match(/^Variant(\d+)$/);
  if (v) return '涂装 ' + v[1];
  const s = slot.match(/^Squadron(\d+)$/);
  if (s) return '中队 ' + s[1];
  return slot;
}

export const TAB_LABELS: Array<{ cat: Category; label: string }> = [
  { cat: 'vessels', label: '舰艇' },
  { cat: 'aircraft', label: '飞机' },
  { cat: 'land_units', label: '陆战单位' },
  { cat: 'ammunition', label: '武器弹药' },
  { cat: 'missions', label: '任务' },
  { cat: 'campaigns', label: '战役' },
];

// ----- Two-level navigation: top-level domain → ordered list of categories.
// Single source of truth for which categories live in which domain. Sidebar
// uses it to render cat-tabs; clicking a domain jumps to its first category.
export const DOMAIN_LABELS: Record<Domain, string> = {
  units: '单位百科',
  operations: '作战行动',
};

export const DOMAIN_OF: Record<Category, Domain> = {
  vessels: 'units',
  aircraft: 'units',
  land_units: 'units',
  ammunition: 'units',
  missions: 'operations',
  campaigns: 'operations',
};

export const CATEGORIES_OF: Record<Domain, Category[]> = {
  units: ['vessels', 'aircraft', 'land_units', 'ammunition'],
  operations: ['missions', 'campaigns'],
};

export const DOMAIN_ORDER: Domain[] = ['units', 'operations'];
