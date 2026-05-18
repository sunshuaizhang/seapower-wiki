// Right pane: shows a placeholder until something is selected; otherwise
// fetches and renders the detail for the current (category, id) tuple.

import { useEffect, useState } from 'react';
import {
  getAmmoDetail,
  getCampaignDetail,
  getMissionDetail,
  getUnitDetail,
} from '../api';
import { useApp } from '../state/useApp';
import type {
  AmmunitionDetail,
  CampaignDetail,
  MissionDetail,
  UnitDetail,
} from '../types';
import { parseMissionId } from '../utils/url';
import { AmmoDetailView } from './AmmoDetailView';
import { CampaignDetailView } from './CampaignDetailView';
import { MissionDetailView } from './MissionDetailView';
import { UnitDetailView } from './UnitDetailView';

type Loaded =
  | { kind: 'unit'; data: UnitDetail }
  | { kind: 'ammo'; data: AmmunitionDetail }
  | { kind: 'mission'; data: MissionDetail }
  | { kind: 'campaign'; data: CampaignDetail };

export function Detail({ streamingAssets }: { streamingAssets: string }) {
  const { category, selectedId } = useApp();
  const [state, setState] = useState<
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'error'; message: string }
    | { phase: 'ready'; loaded: Loaded }
  >({ phase: 'idle' });

  // Reset phase synchronously when the selection changes — render-phase
  // setState avoids the set-state-in-effect lint, and the effect below owns
  // only the async fetch.
  const fetchKey = selectedId ? `${category}|${selectedId}` : '';
  const [lastFetchKey, setLastFetchKey] = useState(fetchKey);
  if (lastFetchKey !== fetchKey) {
    setLastFetchKey(fetchKey);
    setState(fetchKey ? { phase: 'loading' } : { phase: 'idle' });
  }

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    const fetcher: Promise<Loaded> = (() => {
      if (category === 'ammunition') {
        return getAmmoDetail(selectedId).then((data) => ({ kind: 'ammo', data }) as const);
      }
      if (category === 'missions') {
        const parsed = parseMissionId(selectedId);
        if (!parsed) return Promise.reject(new Error('bad mission id'));
        return getMissionDetail(parsed.folder, parsed.id).then(
          (data) => ({ kind: 'mission', data }) as const,
        );
      }
      if (category === 'campaigns') {
        return getCampaignDetail(selectedId).then(
          (data) => ({ kind: 'campaign', data }) as const,
        );
      }
      return getUnitDetail(category, selectedId).then(
        (data) => ({ kind: 'unit', data }) as const,
      );
    })();
    fetcher
      .then((loaded) => {
        if (alive) setState({ phase: 'ready', loaded });
      })
      .catch((e: unknown) => {
        if (alive) setState({ phase: 'error', message: String(e) });
      });
    return () => {
      alive = false;
    };
  }, [category, selectedId]);

  return (
    <section className="detail" id="detail">
      {state.phase === 'idle' && <IdlePlaceholder streamingAssets={streamingAssets} />}
      {state.phase === 'loading' && <LoadingPlaceholder />}
      {state.phase === 'error' && (
        <div style={{ color: 'var(--danger)', padding: 20 }}>错误: {state.message}</div>
      )}
      {state.phase === 'ready' && renderLoaded(state.loaded)}
    </section>
  );
}

// Pull the render switch out of the JSX IIFE so a missing `kind` case is a
// compile error (the JSX inline version returns `void` and silently renders
// nothing for unhandled discriminants).
function renderLoaded(loaded: Loaded) {
  switch (loaded.kind) {
    case 'unit':     return <UnitDetailView u={loaded.data} />;
    case 'ammo':     return <AmmoDetailView a={loaded.data} />;
    case 'mission':  return <MissionDetailView m={loaded.data} />;
    case 'campaign': return <CampaignDetailView c={loaded.data} />;
  }
}

function IdlePlaceholder({ streamingAssets }: { streamingAssets: string }) {
  return (
    <div className="placeholder">
      <div className="placeholder-grid"></div>
      <div className="placeholder-text">
        <p className="op">[ 待命 ]</p>
        <p>从左侧选择单位以展示情报概览。</p>
        <p className="dim">
          数据源: <code>{streamingAssets}</code>
        </p>
      </div>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="placeholder">
      <div className="placeholder-grid"></div>
      <div className="placeholder-text">
        <p className="op">[ 获取中 ]</p>
      </div>
    </div>
  );
}
