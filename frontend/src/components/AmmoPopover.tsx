// Click popover for ammunition links. Mounted at App root, driven by the
// ammoPopover state in AppContext. Positioning / dismissal / close button
// live in the shared <ClickPopover> shell; this component only handles the
// state subscription, fetch+cache and body rendering.

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getAmmoDetail } from '../api';
import { AMMO_STAT_KEYS } from '../constants';
import { useApp } from '../state/useApp';
import type { AmmunitionDetail } from '../types';
import { createFetchCache } from '../utils/fetchCache';
import type { FetchResult } from '../utils/fetchCache';
import { truncate } from '../utils/format';
import { ClickPopover } from './ClickPopover';

const fetchCached = createFetchCache<AmmunitionDetail>(getAmmoDetail);

// Clicking another ammo link shouldn't auto-close; let its own handler swap
// the open popover instead. Stable reference for the shell's effect deps.
const TRIGGERS = ['.ammo-link'];

export function AmmoPopover() {
  const { ammoPopover, closeAmmoPopover } = useApp();
  const [data, setData] = useState<FetchResult<AmmunitionDetail> | null>(null);

  // Reset data synchronously when the target id changes. Render-phase setState
  // is what react-hooks/set-state-in-effect wants; the effect below only owns
  // the async fetch.
  const fetchKey = ammoPopover ? ammoPopover.id : '';
  const [lastFetchKey, setLastFetchKey] = useState(fetchKey);
  if (lastFetchKey !== fetchKey) {
    setLastFetchKey(fetchKey);
    setData(null);
  }

  useEffect(() => {
    if (!ammoPopover) return;
    let alive = true;
    fetchCached(ammoPopover.id).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [ammoPopover]);

  return (
    <ClickPopover
      anchor={ammoPopover?.anchorEl ?? null}
      onClose={closeAmmoPopover}
      className="ammo-tooltip"
      triggerSelectors={TRIGGERS}
    >
      {data === null && <div className="ammo-tip-loading">加载中…</div>}
      {data !== null && 'error' in data && (
        <div className="ammo-tip-loading">加载失败: {data.error}</div>
      )}
      {data !== null && !('error' in data) && <AmmoBody a={data} />}
    </ClickPopover>
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

  const desc = truncate(a.description);

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
