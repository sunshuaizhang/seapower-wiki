// Left rail: search + nation/type filters + counter + scrollable unit list.
// Fetches the list whenever (category, lang) changes.

import { useEffect, useMemo, useState } from 'react';
import { getUnits } from '../api';
import { useApp } from '../state/useApp';
import type { UnitSummary } from '../types';
import { UnitListItem } from './UnitListItem';

export function Sidebar() {
  const {
    category,
    lang,
    search,
    setSearch,
    filterNation,
    setFilterNation,
    filterType,
    setFilterType,
    selectedId,
    setSelectedId,
  } = useApp();

  const [all, setAll] = useState<UnitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset list state synchronously when (category, lang) changes — this happens
  // during render, not inside an effect, so React's set-state-in-effect rule
  // does not flag it. The effect below only owns the async fetch.
  const fetchKey = `${category}|${lang}`;
  const [lastFetchKey, setLastFetchKey] = useState(fetchKey);
  if (lastFetchKey !== fetchKey) {
    setLastFetchKey(fetchKey);
    setAll([]);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let alive = true;
    getUnits(category, lang)
      .then((list) => {
        if (!alive) return;
        setAll(list);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(String(e));
        setAll([]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [category, lang]);

  // Build dropdown options from whatever values appear in the current list.
  // Sticky on remount: if the current filter value disappears, fall back to "all".
  const nations = useMemo(() => {
    const s = new Set<string>();
    for (const u of all) if (u.nation) s.add(u.nation);
    return Array.from(s).sort();
  }, [all]);
  const types = useMemo(() => {
    const s = new Set<string>();
    for (const u of all) if (u.type) s.add(u.type);
    return Array.from(s).sort();
  }, [all]);

  useEffect(() => {
    if (filterNation && !nations.includes(filterNation)) setFilterNation('');
  }, [nations, filterNation, setFilterNation]);
  useEffect(() => {
    if (filterType && !types.includes(filterType)) setFilterType('');
  }, [types, filterType, setFilterType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((u) => {
      if (filterNation && u.nation !== filterNation) return false;
      if (filterType && u.type !== filterType) return false;
      if (q) {
        const hay = `${u.id} ${u.name ?? ''} ${u.type ?? ''} ${u.nation ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, search, filterNation, filterType]);

  return (
    <aside className="sidebar">
      <div className="searchbar">
        <input
          type="search"
          id="search"
          placeholder="搜索  ID / 名称 / 型号"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filters">
        <label>国家</label>
        <select
          id="filterNation"
          value={filterNation}
          onChange={(e) => setFilterNation(e.target.value)}
        >
          <option value="">全部</option>
          {nations.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <label>类型</label>
        <select
          id="filterType"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">全部</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="counter" id="counter">
        {filtered.length} / {all.length} 条
      </div>
      <div className="list" id="list">
        {loading && (
          <div
            style={{
              padding: 14,
              color: 'var(--text-faint)',
              fontFamily: 'var(--mono)',
            }}
          >
            加载中…
          </div>
        )}
        {error && (
          <div style={{ padding: 14, color: 'var(--danger)' }}>错误: {error}</div>
        )}
        {!loading &&
          !error &&
          filtered.map((u) => (
            <UnitListItem
              key={u.id}
              u={u}
              selected={u.id === selectedId}
              onClick={() => setSelectedId(u.id)}
            />
          ))}
      </div>
    </aside>
  );
}
