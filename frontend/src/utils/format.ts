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

// Append an ellipsis to text that exceeds `max` characters. Used by popovers
// that show a description preview but can't fit the full game text.
export function truncate(text: string | null | undefined, max = 200): string | null {
  if (!text) return null;
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// Pretty-print numeric values from the INI: strip useless trailing ".0",
// add thousand-separators for values ≥ 1000, but leave non-numeric strings
// (e.g. "Fighter", "Small", "12,000hp") untouched.
const NUM_FORMAT = new Intl.NumberFormat('zh-CN');
export function formatNumber(raw: string): string {
  if (!raw) return raw;
  const s = raw.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return raw;
  const n = Number(s);
  if (!Number.isFinite(n)) return raw;
  if (Number.isInteger(n)) return NUM_FORMAT.format(n);
  // Float — drop trailing zeros but keep precision (e.g. 0.612 → 0.612, 23600.0 → 23,600).
  const trimmed = s.replace(/\.?0+$/, '');
  if (!trimmed.includes('.')) return NUM_FORMAT.format(Number(trimmed));
  const [whole, frac] = trimmed.split('.');
  return `${NUM_FORMAT.format(Number(whole))}.${frac}`;
}
