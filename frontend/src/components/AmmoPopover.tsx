// Singleton click popover for ammunition links. Mounted at App root and
// driven by ammoPopover state in AppContext. Handles fetch+cache, position,
// outside-click and Esc dismissal.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getAmmoDetail } from '../api';
import { AMMO_STAT_KEYS } from '../constants';
import { useApp } from '../state/useApp';
import type { AmmunitionDetail } from '../types';

type AmmoResult = AmmunitionDetail | { error: string };
type CacheEntry = AmmoResult | Promise<AmmoResult>;

const cache = new Map<string, CacheEntry>();

function fetchCached(id: string, lang: string): Promise<AmmoResult> {
  const key = `${lang}|${id}`;
  const existing = cache.get(key);
  if (existing) return Promise.resolve(existing);
  const p: Promise<AmmoResult> = getAmmoDetail(id, lang)
    .then((d) => {
      cache.set(key, d);
      return d as AmmoResult;
    })
    .catch((e: unknown) => {
      const r: AmmoResult = { error: String(e) };
      cache.set(key, r);
      return r;
    });
  cache.set(key, p);
  return p;
}

export function AmmoPopover() {
  const { ammoPopover, closeAmmoPopover, lang } = useApp();
  const [data, setData] = useState<AmmoResult | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Reset data synchronously when the (id, lang) target changes. Render-phase
  // setState is what the set-state-in-effect rule wants; the effect below only
  // owns the async fetch. Loading is "data === null while ammoPopover != null".
  const fetchKey = ammoPopover ? `${lang}|${ammoPopover.id}` : '';
  const [lastFetchKey, setLastFetchKey] = useState(fetchKey);
  if (lastFetchKey !== fetchKey) {
    setLastFetchKey(fetchKey);
    setData(null);
  }

  useEffect(() => {
    if (!ammoPopover) return;
    let alive = true;
    fetchCached(ammoPopover.id, lang).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [ammoPopover, lang]);

  // Position after content paints. Re-runs when data arrives so the popover
  // size is accurate.
  useLayoutEffect(() => {
    if (!ammoPopover || !ref.current) return;
    positionPopover(ref.current, ammoPopover.anchorEl);
  }, [ammoPopover, data]);

  // Outside-click + Esc to dismiss. Listeners are only attached while open.
  useEffect(() => {
    if (!ammoPopover) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      // Clicking another ammo-link is handled by AmmoLink's own onClick; don't
      // also fire close here or we'd race the open.
      if (target.closest?.('.ammo-link')) return;
      closeAmmoPopover();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAmmoPopover();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [ammoPopover, closeAmmoPopover]);

  const visible = !!ammoPopover;
  return (
    <div ref={ref} className={`ammo-tooltip${visible ? ' visible' : ''}`}>
      {visible && data === null && <div className="ammo-tip-loading">加载中…</div>}
      {visible && data !== null && 'error' in data && (
        <div className="ammo-tip-loading">加载失败: {data.error}</div>
      )}
      {visible && data !== null && !('error' in data) && <AmmoBody a={data} />}
    </div>
  );
}

function AmmoBody({ a }: { a: AmmunitionDetail }) {
  const name =
    a.codename && a.codename !== a.name ? `${a.name || a.id} “${a.codename}”` : a.name || a.id;

  const chips: ReactNode[] = [];
  if (a.category) chips.push(<span key="cat" className="ammo-tip-chip accent">{a.category}</span>);
  if (a.type) chips.push(<span key="type" className="ammo-tip-chip">{a.type}</span>);
  if (a.targetType) chips.push(<span key="target" className="ammo-tip-chip warn">{a.targetType}</span>);
  if (a.nation) chips.push(<span key="nation" className="ammo-tip-chip">{a.nation}</span>);

  const cells: ReactNode[] = [];
  if (a.specs) {
    for (const [key, label, unit] of AMMO_STAT_KEYS) {
      const v = a.specs[key];
      if (v === undefined || v === null || v === '') continue;
      cells.push(
        <div key={key} className="ammo-tip-cell">
          <div className="ammo-tip-k">{label}</div>
          <div className="ammo-tip-v">
            {v}
            {unit && <span className="ammo-tip-u"> {unit}</span>}
          </div>
        </div>,
      );
      if (cells.length >= 6) break;
    }
  }

  const desc =
    a.description && a.description.length > 200 ? a.description.slice(0, 200) + '…' : a.description;

  return (
    <div className="ammo-tip">
      <div className="ammo-tip-head">
        <div className="ammo-tip-name">{name}</div>
        {chips.length > 0 && <div className="ammo-tip-chips">{chips}</div>}
      </div>
      {cells.length > 0 && <div className="ammo-tip-grid">{cells}</div>}
      {desc && <div className="ammo-tip-desc">{desc}</div>}
    </div>
  );
}

function positionPopover(tip: HTMLElement, anchor: HTMLElement) {
  tip.style.left = '0px';
  tip.style.top = '0px';
  const r = anchor.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const margin = 8;
  let left = r.right + margin;
  let top = r.top;
  if (left + tw > window.innerWidth - margin) {
    left = Math.max(margin, r.left - tw - margin);
  }
  if (top + th > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - th - margin);
  }
  if (top < margin) top = margin;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
