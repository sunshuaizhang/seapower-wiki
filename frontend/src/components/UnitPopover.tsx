// Click popover for unit chips inside mission/campaign views. State + fetch
// live here; positioning / dismissal / close button come from the shared
// <ClickPopover> shell. "打开完整页" opens a new tab via the URL hash router.

import { useEffect, useState } from 'react';
import { getUnitDetail, imageUrl } from '../api';
import { KEY_STATS_BY_CATEGORY, specHint } from '../constants';
import { useApp } from '../state/useApp';
import type { Category, UnitDetail } from '../types';
import { createFetchCache } from '../utils/fetchCache';
import type { FetchResult } from '../utils/fetchCache';
import { formatNumber, truncate } from '../utils/format';
import { fullPageUrl } from '../utils/url';
import { ClickPopover } from './ClickPopover';

// Cache key folds the category in so vessels:foo and aircraft:foo don't collide.
const fetchCached = createFetchCache<UnitDetail>((key) => {
  const pipe = key.indexOf('|');
  const cat = key.substring(0, pipe) as Category;
  const id = key.substring(pipe + 1);
  return getUnitDetail(cat, id);
});

// Triggers whose clicks should NOT auto-close this popover — they're the
// chips that may be opening a different unit popover and would race the
// dismiss otherwise.
const TRIGGERS = ['.unit-chip', '.roster-unit'];

export function UnitPopover() {
  const { unitPopover, closeUnitPopover } = useApp();
  const [data, setData] = useState<FetchResult<UnitDetail> | null>(null);

  const fetchKey = unitPopover ? `${unitPopover.category}|${unitPopover.id}` : '';
  const [lastFetchKey, setLastFetchKey] = useState(fetchKey);
  if (lastFetchKey !== fetchKey) {
    setLastFetchKey(fetchKey);
    setData(null);
  }

  useEffect(() => {
    if (!unitPopover) return;
    let alive = true;
    fetchCached(fetchKey).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [unitPopover, fetchKey]);

  const openFullPage = () => {
    if (!unitPopover) return;
    const url = fullPageUrl(unitPopover.category, unitPopover.id);
    window.open(url, '_blank', 'noopener');
    closeUnitPopover();
  };

  return (
    <ClickPopover
      anchor={unitPopover?.anchorEl ?? null}
      onClose={closeUnitPopover}
      className="unit-tooltip"
      triggerSelectors={TRIGGERS}
    >
      {data === null && <div className="ammo-tip-loading">加载中…</div>}
      {data !== null && 'error' in data && (
        <div className="ammo-tip-loading">加载失败: {data.error}</div>
      )}
      {data !== null && !('error' in data) && (
        <UnitBody u={data} onOpenFull={openFullPage} />
      )}
    </ClickPopover>
  );
}

function UnitBody({ u, onOpenFull }: { u: UnitDetail; onOpenFull: () => void }) {
  const heroName = u.images?.primary || u.id;
  const stats = pickQuickStats(u);
  return (
    <div className="unit-tip">
      <div className="unit-tip-head">
        <img
          className="unit-tip-img"
          src={imageUrl(heroName)}
          alt={heroName}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="unit-tip-id">
          <div className="unit-tip-name">{u.name || u.id}</div>
          <div className="unit-tip-meta">
            {u.type && <span>{u.type}</span>}
            {u.nation && <span>{u.nation}</span>}
            {u.role && <span>{u.role}</span>}
          </div>
        </div>
        <button type="button" className="unit-tip-open" onClick={onOpenFull}>
          打开完整页 →
        </button>
      </div>
      {stats.length > 0 && (
        <div className="unit-tip-stats">
          {stats.map((s, i) => (
            <div className="unit-tip-stat" key={i}>
              <div className="unit-tip-stat-k">{s.label}</div>
              <div className="unit-tip-stat-v">
                {s.value}
                {s.unit && <span className="unit-tip-stat-u"> {s.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {u.description && (
        <div className="unit-tip-desc">{truncate(u.description)}</div>
      )}
    </div>
  );
}

type QuickStat = { label: string; value: string; unit: string };

function pickQuickStats(u: UnitDetail): QuickStat[] {
  const want = KEY_STATS_BY_CATEGORY[u.category] || [];
  const out: QuickStat[] = [];
  const specs = u.specs || {};
  for (const [key, label, unit] of want) {
    const v = specs[key];
    if (v === undefined || v === null || v === '') continue;
    out.push({ label, value: formatNumber(String(v)), unit });
    // specHint isn't useful in the condensed popover — keep the dep for the
    // shared signature though so callers can introduce it later.
    void specHint;
    if (out.length >= 4) break;
  }
  return out;
}
