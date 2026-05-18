// Single source of truth for backend endpoints. The base URL is empty in dev
// (Vite proxy handles /api/*) and points to the deployed backend in production.
// All endpoints request the backend's default Chinese locale — multi-language
// support exists on the server but is not surfaced in the UI right now.

import type {
  AmmunitionDetail,
  CampaignDetail,
  CampaignSummary,
  Meta,
  MissionDetail,
  MissionSummary,
  Nations,
  UnitDetail,
  UnitSummary,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const LANG = 'cn';

async function fetchJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return (await r.json()) as T;
}

export function getMeta(): Promise<Meta> {
  return fetchJSON<Meta>('/api/meta');
}

export function getNations(): Promise<Nations> {
  return fetchJSON<Nations>('/api/nations');
}

export function getUnits(category: string): Promise<UnitSummary[]> {
  return fetchJSON<UnitSummary[]>(`/api/${category}?lang=${LANG}`);
}

// Maps the listing category to the detail endpoint segment.
const DETAIL_PATH: Record<string, string> = {
  vessels: 'vessel',
  aircraft: 'aircraft',
  land_units: 'land_unit',
  ammunition: 'ammo',
};

export function getUnitDetail(category: string, id: string): Promise<UnitDetail> {
  const seg = DETAIL_PATH[category];
  return fetchJSON<UnitDetail>(`/api/${seg}/${encodeURIComponent(id)}?lang=${LANG}`);
}

export function getAmmoDetail(id: string): Promise<AmmunitionDetail> {
  return fetchJSON<AmmunitionDetail>(
    `/api/ammo/${encodeURIComponent(id)}?lang=${LANG}`,
  );
}

// Image URLs are not fetched as JSON — the <img> tag handles them directly.
// Centralized so VITE_API_BASE applies in production deployments too.
export function imageUrl(name: string): string {
  return `${BASE}/api/image/${encodeURIComponent(name)}.png`;
}

// ----- Missions & Campaigns -----

export function getMissions(): Promise<MissionSummary[]> {
  return fetchJSON<MissionSummary[]>(`/api/missions?lang=${LANG}`);
}

export function getMissionDetail(folder: string, id: string): Promise<MissionDetail> {
  return fetchJSON<MissionDetail>(
    `/api/mission/${encodeURIComponent(folder)}/${encodeURIComponent(id)}?lang=${LANG}`,
  );
}

export function getCampaigns(): Promise<CampaignSummary[]> {
  return fetchJSON<CampaignSummary[]>(`/api/campaigns?lang=${LANG}`);
}

export function getCampaignDetail(id: string): Promise<CampaignDetail> {
  return fetchJSON<CampaignDetail>(`/api/campaign/${encodeURIComponent(id)}?lang=${LANG}`);
}

/** Loose-file asset URL (briefing maps, campaign art). Path is relative to
 *  StreamingAssets/original/ and may contain slashes/spaces — we encode each
 *  segment so the backend's PATH_WITHIN_HANDLER_MAPPING attribute receives
 *  the right thing after Spring URL-decodes. */
export function assetUrl(relativePath: string): string {
  const parts = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${BASE}/api/asset/${parts}`;
}
