// Misc presentation helpers shared across views.

import type { UnitDetail } from '../types';

// Render an INI-like text dump of the raw map. Mirrors the original's formatRaw().
export function formatRaw(raw: Record<string, Record<string, string>> | null | undefined): string {
  if (!raw) return '';
  const lines: string[] = [];
  for (const [section, kv] of Object.entries(raw)) {
    lines.push(`[${section}]`);
    for (const [k, v] of Object.entries(kv)) lines.push(`${k} = ${v}`);
    lines.push('');
  }
  return lines.join('\n');
}

// Service-date string format from game: "1983|2004" or "1983". Render with en-dash.
export function formatServiceDate(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.replace('|', ' – ');
}

// First variant with a service date — used to put the unit's earliest year in the hero sub.
export function firstServiceYear(u: UnitDetail): string | null {
  if (!u.variants) return null;
  for (const v of u.variants) {
    if (v.serviceDate) return formatServiceDate(v.serviceDate);
  }
  return null;
}

// Return the first non-empty value among the provided spec keys.
export function specFrom(
  specs: Record<string, string> | null | undefined,
  keys: string[],
): string | null {
  if (!specs) return null;
  for (const k of keys) if (specs[k]) return specs[k];
  return null;
}
