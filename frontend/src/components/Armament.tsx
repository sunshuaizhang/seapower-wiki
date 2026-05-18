// Weapons + magazines fused into one list, with a loadout selector for units
// that ship multiple loadouts (aircraft missions, ship "Late" refits, etc.).
// Always-on systems (CIWS, chaff, ship missile launchers without variants) are
// shown in every loadout view; loadout-specific stations are filtered. Fuel
// tanks live in a separate "外挂副油箱" sub-list since they aren't weapons.

import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Magazine, UnitDetail, WeaponMount } from '../types';
import { AmmoLink } from './AmmoLink';
import { Section } from './Section';

export function Armament({ u }: { u: UnitDetail }) {
  // Slots with >1 distinct loadout are loadout-specific; the rest are always-on.
  const loadoutSpecificSlots = useMemo(() => {
    const slotLoadouts = new Map<string, Set<string>>();
    for (const w of u.weapons || []) {
      const idx = slotIndex(w.slot);
      let s = slotLoadouts.get(idx);
      if (!s) {
        s = new Set();
        slotLoadouts.set(idx, s);
      }
      s.add(w.loadout || 'Default');
    }
    const specific = new Set<string>();
    for (const [idx, ls] of slotLoadouts) {
      if (ls.size > 1) specific.add(idx);
    }
    return specific;
  }, [u.weapons]);

  const availableLoadouts = u.loadouts && u.loadouts.length > 0
    ? u.loadouts
    : ['Default'];

  const [selected, setSelected] = useState<string>('Default');
  const active = availableLoadouts.includes(selected)
    ? selected
    : availableLoadouts[0];

  const visible = (u.weapons || []).filter((w) => {
    const idx = slotIndex(w.slot);
    if (!loadoutSpecificSlots.has(idx)) return true;
    return (w.loadout || 'Default') === active;
  });

  const armaments: WeaponMount[] = [];
  const stores: WeaponMount[] = [];
  for (const w of visible) {
    if (isExternalStore(w.type)) stores.push(w);
    else armaments.push(w);
  }

  const magLookup = new Map<string, Magazine>(
    (u.magazines || []).map((m) => [m.name, m] as const),
  );

  const showSelector = availableLoadouts.length > 1;

  return (
    <Section title="武装系统" count={`${armaments.length} 项武装`}>
      {showSelector && (
        <div className="loadout-tabs">
          {availableLoadouts.map((l) => (
            <button
              key={l}
              type="button"
              className={`loadout-tab ${l === active ? 'is-active' : ''}`}
              onClick={() => setSelected(l)}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      {armaments.length > 0 ? (
        <div className="wsys-list">{renderRows(armaments, magLookup, active)}</div>
      ) : (
        <div className="wsys-empty">该挂载方案下无武装</div>
      )}
      {stores.length > 0 && (
        <>
          <div className="wsys-subheading">外挂副油箱</div>
          <div className="wsys-list">{renderRows(stores, magLookup, active)}</div>
        </>
      )}
    </Section>
  );
}

function renderRows(
  rows: WeaponMount[],
  magLookup: Map<string, Magazine>,
  active: string,
): ReactNode[] {
  // Collapse identical adjacent mounts ("2× AIM-7M") by signature.
  const grouped = new Map<string, { w: WeaponMount; count: number }>();
  const order: string[] = [];
  for (const w of rows) {
    const key = `${w.type ?? ''}|${w.systemName ?? ''}|${w.ammunitionId ?? ''}|${w.magazineRef ?? ''}`;
    const cur = grouped.get(key);
    if (cur) cur.count++;
    else {
      grouped.set(key, { w, count: 1 });
      order.push(key);
    }
  }
  return order.map((key) => {
    const { w, count } = grouped.get(key)!;
    const typeClass = (w.type || '').toLowerCase();
    // For aircraft stations the parent's "Hardpoint" SystemName is a placeholder,
    // not a real launcher name. Drop it and shift the count to the ammo column so
    // a row reads "[MISSILE] — — 2× AIM-9L" instead of "Hardpoint × 2 / AIM-9L".
    const usefulName = !!w.systemName && w.systemName !== 'Hardpoint';
    return (
      <div className="wsys-row" key={`${active}-${key}`}>
        <div className={`w-type ${typeClass}`}>{w.type || '—'}</div>
        <div className="w-name">
          {usefulName
            ? count > 1
              ? `${count}× ${w.systemName}`
              : w.systemName
            : ''}
        </div>
        <div className="w-ammo">
          {!usefulName && count > 1 && (
            <span style={{ marginRight: 4 }}>{count}×</span>
          )}
          <WeaponAmmo w={w} magLookup={magLookup} />
          {w.dateBasedSchedule && (
            <span
              className="datebased-mark"
              title={w.dateBasedSchedule}
              aria-label={w.dateBasedSchedule}
            >
              📅
            </span>
          )}
        </div>
      </div>
    );
  });
}

function slotIndex(slot: string): string {
  const m = /^WeaponSystem(\d+)/.exec(slot);
  return m ? m[1] : slot;
}

function isExternalStore(type: string | null): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === 'fueltank' || t === 'tank';
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
