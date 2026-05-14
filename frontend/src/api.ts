// Single source of truth for backend endpoints. The base URL is empty in dev
// (Vite proxy handles /api/*) and points to the deployed backend in production.

import type {
  AmmunitionDetail,
  Meta,
  Nations,
  UnitDetail,
  UnitSummary,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

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

export function getUnits(category: string, lang: string): Promise<UnitSummary[]> {
  return fetchJSON<UnitSummary[]>(`/api/${category}?lang=${encodeURIComponent(lang)}`);
}

// Maps the listing category to the detail endpoint segment.
const DETAIL_PATH: Record<string, string> = {
  vessels: 'vessel',
  aircraft: 'aircraft',
  land_units: 'land_unit',
  ammunition: 'ammo',
};

export function getUnitDetail(
  category: string,
  id: string,
  lang: string,
): Promise<UnitDetail> {
  const seg = DETAIL_PATH[category];
  return fetchJSON<UnitDetail>(`/api/${seg}/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`);
}

export function getAmmoDetail(id: string, lang: string): Promise<AmmunitionDetail> {
  return fetchJSON<AmmunitionDetail>(
    `/api/ammo/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`,
  );
}

// Image URLs are not fetched as JSON — the <img> tag handles them directly.
// Centralized so VITE_API_BASE applies in production deployments too.
export function imageUrl(name: string): string {
  return `${BASE}/api/image/${encodeURIComponent(name)}.png`;
}
