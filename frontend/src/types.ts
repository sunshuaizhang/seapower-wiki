// All response shapes — kept in lockstep with the Spring Boot DTOs in
// com.seapower.wiki.model.*. Field naming follows the JSON wire format.

export type Category = 'vessels' | 'aircraft' | 'land_units' | 'ammunition';

export type Meta = {
  streamingAssets: string;
  defaultLanguage: string;
  languages: string[];
  categories: string[];
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

export type WeaponMount = {
  loadout: string;
  slot: string;
  type: string | null;
  systemName: string | null;
  ammunitionId: string | null;
  magazineRef: string | null;
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
