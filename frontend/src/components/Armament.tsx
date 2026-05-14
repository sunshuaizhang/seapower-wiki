// Weapons + magazines fused into one list, grouped by loadout, with duplicates
// (e.g. 2× MK26) collapsed and per-ammo links delegated to <AmmoLink/>.

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { Magazine, UnitDetail, WeaponMount } from '../types';
import { AmmoLink } from './AmmoLink';
import { Section } from './Section';

export function Armament({ u }: { u: UnitDetail }) {
  const weapons = u.weapons || [];

  const byLoadout = new Map<string, WeaponMount[]>();
  for (const w of weapons) {
    const k = w.loadout || 'Default';
    const arr = byLoadout.get(k);
    if (arr) arr.push(w);
    else byLoadout.set(k, [w]);
  }
  const magLookup = new Map<string, Magazine>(
    (u.magazines || []).map((m) => [m.name, m] as const),
  );

  const rows: ReactNode[] = [];
  let idx = 0;
  for (const [loadout, wps] of byLoadout) {
    const grouped = new Map<string, { w: WeaponMount; count: number }>();
    for (const w of wps) {
      const key = `${w.type ?? ''}|${w.systemName ?? ''}|${w.ammunitionId ?? ''}|${w.magazineRef ?? ''}`;
      const cur = grouped.get(key);
      if (cur) cur.count++;
      else grouped.set(key, { w, count: 1 });
    }
    for (const { w, count } of grouped.values()) {
      const typeClass = (w.type || '').toLowerCase();
      rows.push(
        <div className="wsys-row" key={`${loadout}-${idx++}`}>
          <div className={`w-type ${typeClass}`}>{w.type || '—'}</div>
          <div className="w-name">
            {count > 1 ? `${count}× ` : ''}
            {w.systemName || '—'}
            {loadout !== 'Default' && (
              <span className="w-loadout">[{loadout}]</span>
            )}
          </div>
          <div className="w-ammo">
            <WeaponAmmo w={w} magLookup={magLookup} />
          </div>
        </div>,
      );
    }
  }

  return (
    <Section title="武装系统" count={`${weapons.length} 个挂点`}>
      <div className="wsys-list">{rows}</div>
    </Section>
  );
}

function WeaponAmmo({
  w,
  magLookup,
}: {
  w: WeaponMount;
  magLookup: Map<string, Magazine>;
}) {
  if (w.ammunitionId) return <AmmoLink id={w.ammunitionId} />;
  if (w.magazineRef) {
    const m = magLookup.get(w.magazineRef);
    if (m && m.contents && m.contents.length) {
      return (
        <>
          {m.contents.map((c, i) => (
            <Fragment key={c.ammoId}>
              {i > 0 && ' · '}
              <AmmoLink id={c.ammoId} />
              <span
                className="count"
                style={{ color: 'var(--accent)', marginLeft: 4 }}
              >
                ×{c.count}
              </span>
            </Fragment>
          ))}
        </>
      );
    }
    return <span style={{ color: 'var(--text-faint)' }}>→ {w.magazineRef}</span>;
  }
  return <span style={{ color: 'var(--text-faint)' }}>—</span>;
}
