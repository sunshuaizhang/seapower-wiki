// All response shapes — kept in lockstep with the Spring Boot DTOs in
// com.seapower.wiki.model.*. Field naming follows the JSON wire format.

export type Category =
  | 'vessels'
  | 'aircraft'
  | 'land_units'
  | 'ammunition'
  | 'missions'
  | 'campaigns';

/** Top-level domain. "units" groups the four encyclopedia categories;
 *  "operations" groups missions + campaigns. Derived from category — we never
 *  store it directly so the two stay in sync. */
export type Domain = 'units' | 'operations';

export type GameVersion = {
  date: string;      // e.g. "10-Mar-2026"
  version: string;   // e.g. "0.7.9"
  build: string;     // e.g. "310"
};

export type Meta = {
  streamingAssets: string;
  defaultLanguage: string;
  languages: string[];
  categories: string[];
  gameVersion?: GameVersion;
};

export type Nations = Record<string, string>;

export type UnitSummary = {
  id: string;
  category: string;
  nation: string | null;
  nationPrefix: string | null;
  type: string | null;
  name: string | null;
  shortName: string | null;
  subType: string | null;
};

// ----- Missions & Campaigns -----

export type MissionSummary = {
  id: string;
  folder: string;
  name: string;
  date: string | null;
  difficulty: number;
  location: string;
};

export type MissionDetail = MissionSummary & {
  description: string | null;
  time: string | null;
  environment: {
    date: string | null;
    time: string | null;
    seaState: string | null;
    clouds: string | null;
    windDirection: string | null;
    mapCenterLat: number;
    mapCenterLon: number;
  };
  playerSide: MissionSide;
  enemySide: MissionSide;
  formations: MissionFormation[];
  units: MissionUnit[];
  objectives: MissionObjective[];
  briefing: Briefing | null;
  mapImage: string | null;
};

export type MissionSide = {
  taskforce: string;
  label: string;
  vessels: number;
  aircraft: number;
  submarines: number;
  helicopters: number;
  landUnits: number;
};

export type MissionFormation = {
  side: string;
  name: string | null;
  pattern: string | null;
  unitSlots: string[];
};

export type MissionUnit = {
  slot: string;
  side: string;
  unitId: string;
  variant: string | null;
  missionType: string | null;
  nameOverride: string | null;
  /** Quantity for embarked-air-wing entries (>=1 always). */
  count: number;
  /** Slot of the host vessel for embarked aircraft; null for stand-alone units. */
  parentSlot: string | null;
};

export type MissionObjective = {
  key: string;
  text: string;
};

export type Briefing = {
  rowTracks: string[];
  colTracks: string[];
  cells: BriefingCell[];
};

export type BriefingCell = {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  text: string;
  hAlign: string | null;
  vAlign: string | null;
  fontSize: string | null;
  wrap: boolean;
  isImage: boolean;
  imageBinding: string | null;
};

export type CampaignSummary = {
  id: string;
  name: string;
  type: string;
  startDate: string | null;
  playerNation: string | null;
  missionCount: number;
  groupCount: number;
  backgroundImage: string | null;
};

export type CampaignDetail = CampaignSummary & {
  description: string | null;
  friendlyNations: string[];
  missions: TimelineMission[];
  ports: CampaignPortGroup[];
};

export type TimelineMission = {
  missionId: string;
  name: string;
  branch: string | null;
  order: number;
  date: string | null;
  difficulty: number;
  summary: string | null;
  description: string | null;
  objectives: string[];
  playerSide: MissionSide;
  enemySide: MissionSide;
  formations: MissionFormation[];
  units: MissionUnit[];
};

export type CampaignPortGroup = {
  port: string;
  groups: CampaignGroup[];
};

export type CampaignGroup = {
  name: string;
  unitCount: number;
  units: CampaignUnitRow[];
};

export type CampaignUnitRow = {
  unitId: string;
  hullNumber: string;
  missionType: string;
};

export type WeaponMount = {
  loadout: string;
  slot: string;
  type: string | null;
  systemName: string | null;
  ammunitionId: string | null;
  magazineRef: string | null;
  /** Pre-formatted year→ammo schedule for date-based stations (v0.7.9+). */
  dateBasedSchedule: string | null;
};

export type Sensor = {
  slot: string;
  type: string | null;
  systemName: string | null;
};

export type MagazineAmmoEntry = {
  ammoId: string;
  count: number;
};

export type Magazine = {
  name: string;
  moduleType: string | null;
  contents: MagazineAmmoEntry[];
};

export type Variant = {
  slot: string;
  displayName: string | null;
  shortName: string | null;
  nation: string | null;
  serviceDate: string | null;
  notes: string | null;
  hullnumberTexture: string | null;
  emblemTexture: string | null;
  liveryTexture: string | null;
  flagTexture: string | null;
};

export type UnitImages = {
  primary: string | null;
  liveryAtlas: string | null;
  flag: string | null;
};

export type UnitDetail = {
  id: string;
  category: string;
  nation: string | null;
  nationPrefix: string | null;
  type: string | null;
  name: string | null;
  shortName: string | null;
  role: string | null;
  description: string | null;
  specs: Record<string, string>;
  weapons: WeaponMount[];
  loadouts: string[];
  sensors: Sensor[];
  magazines: Magazine[];
  variants: Variant[];
  airGroup: Record<string, string>;
  images: UnitImages;
  raw: Record<string, Record<string, string>>;
};

export type AmmunitionDetail = {
  id: string;
  nation: string | null;
  nationPrefix: string | null;
  name: string | null;
  codename: string | null;
  category: string | null;
  description: string | null;
  type: string | null;
  targetType: string | null;
  specs: Record<string, string>;
  raw: Record<string, Record<string, string>>;
};
