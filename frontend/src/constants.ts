// Display tables shared across components.

import type { Category } from './types';

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
  'Engine Count': '发动机数',
  'Ceiling (ft)': '升限 (ft)',
  'Cruise Altitude (ft)': '巡航高度 (ft)',
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

// Priority order for ammunition stats — first 6 present fields go into the
// hero stats strip / click popover. Tuple = [specKey, displayLabel, unit].
export const AMMO_STAT_KEYS: Array<[string, string, string]> = [
  ['最大射程 (nm)', '最大射程', 'nm'],
  ['最大速度 (kn)', '最大速度', 'kn'],
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
    ['Horsepower (hp)', '功率', 'hp'],
    ['AAW Capability', '防空指数', ''],
    ['ASW Capability', '反潜指数', ''],
  ],
  aircraft: [
    ['Wing Span (m)', '翼展', 'm'],
    ['Max Speed SL (kn)', '最大平飞速度', 'kn'],
    ['Mach Limit', '马赫极限', ''],
    ['Ceiling (ft)', '升限', 'ft'],
    ['Max Climb Rate (m/s)', '爬升率', 'm/s'],
    ['Engine Count', '发动机数', ''],
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
];

export const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'cn', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'vn', label: 'Tiếng Việt' },
];
