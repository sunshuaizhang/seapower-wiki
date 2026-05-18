// Left rail: category tabs + nation-grouped unit list. Accordion behavior on
// the nation groups — at most one expanded at a time, click another to swap.

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getCampaigns, getMissions, getUnits } from '../api';
import {
  CATEGORIES_OF,
  DOMAIN_LABELS,
  DOMAIN_OF,
  DOMAIN_ORDER,
  TAB_LABELS,
} from '../constants';
import { useApp } from '../state/useApp';
import type {
  CampaignSummary,
  Category,
  Domain,
  MissionSummary,
  UnitSummary,
} from '../types';
import { difficultyStars } from '../utils/difficulty';
import { UnitListItem } from './UnitListItem';

export function Sidebar() {
  const { category, setCategory, selectedId, setSelectedId, setCategoryCount } =
    useApp();

  const [all, setAll] = useState<UnitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOne, setExpandedOne] = useState<string | null>(null);

  // Reset list state synchronously when the category changes. Render-phase
  // setState keeps the lint rule happy; the effect below owns the async fetch.
  const [lastCategory, setLastCategory] = useState(category);
  if (lastCategory !== category) {
    setLastCategory(category);
    setAll([]);
    setLoading(true);
    setError(null);
    // Campaigns are few (currently 2), all live in a single "战役" pseudo-group.
    // Auto-expand it so the user immediately sees the list instead of clicking
    // a one-of-one folder header just to drill in.
    setExpandedOne(category === 'campaigns' ? '战役' : null);
    setCategoryCount(null);
  }

  useEffect(() => {
    let alive = true;
    const fetcher: Promise<UnitSummary[]> =
      category === 'missions'
        ? getMissions().then((rows) => rows.map(missionToRow))
        : category === 'campaigns'
        ? getCampaigns().then((rows) => rows.map(campaignToRow))
        : getUnits(category);
    fetcher
      .then((list) => {
        if (!alive) return;
        setAll(list);
        setCategoryCount(list.length);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(String(e));
        setAll([]);
        setCategoryCount(0);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [category, setCategoryCount]);

  // Sort by nation → type (badge) → display name → id. Same-class ships stay
  // clustered (all FF together, all SSN together) and within a class the rows
  // read alphabetically by their localized name. id is the final tiebreaker
  // for the rare case where two units share name+type.
  const sorted = useMemo(() => {
    const out = [...all];
    out.sort((a, b) => {
      const an = a.nation || '￿';
      const bn = b.nation || '￿';
      if (an !== bn) return an.localeCompare(bn);
      const at = a.type || '￿';
      const bt = b.type || '￿';
      if (at !== bt) return at.localeCompare(bt);
      const aName = a.name || a.id;
      const bName = b.name || b.id;
      if (aName !== bName) return aName.localeCompare(bName);
      return a.id.localeCompare(b.id);
    });
    return out;
  }, [all]);

  const groups = useMemo(() => {
    const map = new Map<string, UnitSummary[]>();
    for (const u of sorted) {
      const n = u.nation || '其他';
      let arr = map.get(n);
      if (!arr) {
        arr = [];
        map.set(n, arr);
      }
      arr.push(u);
    }
    return map;
  }, [sorted]);

  const toggleNation = (n: string) => {
    setExpandedOne((prev) => (prev === n ? null : n));
  };

  // Which nation group contains the currently-selected unit — used to mark the
  // collapsed header so the user can find their selection at a glance.
  const selectedNation = useMemo(() => {
    if (!selectedId) return null;
    const sel = sorted.find((u) => u.id === selectedId);
    return sel ? sel.nation || '其他' : null;
  }, [selectedId, sorted]);

  const activeDomain: Domain = DOMAIN_OF[category];
  const subCategories = CATEGORIES_OF[activeDomain];

  const onDomainClick = (d: Domain) => {
    if (d === activeDomain) return;
    // Jump to that domain's first category — keeps the user inside a working
    // section instead of dumping them on a still-empty operations placeholder.
    setCategory(CATEGORIES_OF[d][0]);
  };

  return (
    <aside className="sidebar">
      <div className="domain-tabs">
        {DOMAIN_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            className={`domain-tab${activeDomain === d ? ' active' : ''}`}
            onClick={() => onDomainClick(d)}
          >
            {DOMAIN_LABELS[d]}
          </button>
        ))}
      </div>
      <div className={`cat-tabs cat-${subCategories.length}`}>
        {subCategories.map((cat) => {
          const t = TAB_LABELS.find((x) => x.cat === cat);
          if (!t) return null;
          return (
            <button
              key={cat}
              type="button"
              className={`cat-tab${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat as Category)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="counter" id="counter">
        共 {sorted.length} 项 · 涉 {groups.size} 国
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
          renderGroups(
            groups,
            expandedOne,
            toggleNation,
            selectedId,
            setSelectedId,
            selectedNation,
          )}
      </div>
    </aside>
  );
}

// Mission id encoding: "<folder>/<file-stem>"; Detail.tsx splits on the first
// "/" to recover the two parts for the backend call. Both adapters reuse the
// nation-grouped UnitListItem pipeline by mapping into UnitSummary shape.
function missionToRow(m: MissionSummary): UnitSummary {
  return {
    id: `${m.folder}/${m.id}`,
    category: 'missions',
    nation: m.folder,
    nationPrefix: null,
    type: difficultyStars(m.difficulty),
    name: m.name,
    shortName: m.date,
    subType: m.location,
  };
}

function campaignToRow(c: CampaignSummary): UnitSummary {
  return {
    id: c.id,
    category: 'campaigns',
    nation: '战役',
    nationPrefix: null,
    type: c.type,
    name: c.name,
    shortName: c.startDate,
    subType: c.playerNation,
  };
}

function renderGroups(
  groups: Map<string, UnitSummary[]>,
  expandedOne: string | null,
  onToggle: (n: string) => void,
  selectedId: string | null,
  setSelectedId: (id: string) => void,
  selectedNation: string | null,
): ReactNode[] {
  const rows: ReactNode[] = [];
  for (const [nation, items] of groups) {
    const open = expandedOne === nation;
    const hasSelected = selectedNation === nation;
    rows.push(
      <button
        key={`hdr-${nation}`}
        type="button"
        className={`nation-toggle${open ? ' is-open' : ''}${
          hasSelected ? ' has-selected' : ''
        }`}
        onClick={() => onToggle(nation)}
        aria-expanded={open}
      >
        <span className="caret">{open ? '▼' : '▶'}</span>
        <span className="name">{nation}</span>
        {hasSelected && <span className="sel-dot" aria-label="包含当前选中" />}
        <span className="count">{items.length}</span>
      </button>,
    );
    if (open) {
      for (const u of items) {
        rows.push(
          <UnitListItem
            key={u.id}
            u={u}
            selected={u.id === selectedId}
            onClick={() => setSelectedId(u.id)}
          />,
        );
      }
    }
  }
  return rows;
}
