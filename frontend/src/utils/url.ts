// URL hash routing: the wiki is a single-page app, but deep links into a
// specific unit detail are useful (sharing, multi-window "打开完整页"). The
// hash carries category + selectedId; the slash inside mission ids stays
// literal so the URL reads cleanly.
//
// Format examples:
//   #vessels:usn_cv_forrestal_75
//   #aircraft:usn_f-14a
//   #ammunition:usn_aim-9l
//   #missions:NATO/Action%20in%20the%20Gulf%20of%20Sidra%201986
//   #campaigns:linear-campaign-proto-1
//   #vessels                       (category only, no selection)

import type { Category } from '../types';

const VALID_CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  'vessels',
  'aircraft',
  'land_units',
  'ammunition',
  'missions',
  'campaigns',
]);

export type RouteState = { category: Category; selectedId: string | null };

export function parseHash(hash: string): RouteState | null {
  if (!hash) return null;
  const raw = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!raw) return null;
  const colon = raw.indexOf(':');
  const catStr = colon < 0 ? raw : raw.substring(0, colon);
  if (!VALID_CATEGORIES.has(catStr as Category)) return null;
  const category = catStr as Category;
  if (colon < 0) return { category, selectedId: null };
  // Decode each path segment so spaces / parens etc. round-trip cleanly; the
  // "/" structure inside mission ids is preserved as-is.
  const tail = raw.substring(colon + 1);
  const selectedId = tail
    .split('/')
    .map((seg) => safeDecode(seg))
    .join('/');
  return { category, selectedId };
}

export function buildHash(category: Category, selectedId: string | null): string {
  if (!selectedId) return `#${category}`;
  const encoded = selectedId
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `#${category}:${encoded}`;
}

/** Absolute URL for opening the wiki at the given (category, id) — used by the
 *  "打开完整页" button to spawn a new browser tab. */
export function fullPageUrl(category: Category, selectedId: string): string {
  const u = new URL(window.location.href);
  u.hash = buildHash(category, selectedId);
  return u.toString();
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Split a mission selectedId ("folder/file-stem") into its two parts. Returns
 *  null when the encoding is malformed (no slash, or either side is empty). */
export function parseMissionId(selectedId: string): { folder: string; id: string } | null {
  const slash = selectedId.indexOf('/');
  if (slash <= 0 || slash === selectedId.length - 1) return null;
  return {
    folder: selectedId.substring(0, slash),
    id: selectedId.substring(slash + 1),
  };
}
