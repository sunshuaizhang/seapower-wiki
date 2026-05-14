// Right pane: shows a placeholder until something is selected; otherwise
// fetches and renders the detail for the current (category, id, lang) tuple.

import { useEffect, useState } from 'react';
import { getAmmoDetail, getUnitDetail } from '../api';
import { useApp } from '../state/useApp';
import type { AmmunitionDetail, UnitDetail } from '../types';
import { AmmoDetailView } from './AmmoDetailView';
import { UnitDetailView } from './UnitDetailView';

type Loaded =
  | { kind: 'unit'; data: UnitDetail }
  | { kind: 'ammo'; data: AmmunitionDetail };

export function Detail({ streamingAssets }: { streamingAssets: string }) {
  const { category, lang, selectedId } = useApp();
  const [state, setState] = useState<
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'error'; message: string }
    | { phase: 'ready'; loaded: Loaded }
  >({ phase: 'idle' });

  // Reset phase synchronously when the selection changes — render-phase
  // setState avoids the set-state-in-effect lint, and the effect below owns
  // only the async fetch.
  const fetchKey = selectedId ? `${category}|${selectedId}|${lang}` : '';
  const [lastFetchKey, setLastFetchKey] = useState(fetchKey);
  if (lastFetchKey !== fetchKey) {
    setLastFetchKey(fetchKey);
    setState(fetchKey ? { phase: 'loading' } : { phase: 'idle' });
  }

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    const isAmmo = category === 'ammunition';
    const fetcher: Promise<Loaded> = isAmmo
      ? getAmmoDetail(selectedId, lang).then((data) => ({ kind: 'ammo', data }) as const)
      : getUnitDetail(category, selectedId, lang).then(
          (data) => ({ kind: 'unit', data }) as const,
        );
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
  }, [category, lang, selectedId]);

  return (
    <section className="detail" id="detail">
      {state.phase === 'idle' && <IdlePlaceholder streamingAssets={streamingAssets} />}
      {state.phase === 'loading' && <LoadingPlaceholder />}
      {state.phase === 'error' && (
        <div style={{ color: 'var(--danger)', padding: 20 }}>错误: {state.message}</div>
      )}
      {state.phase === 'ready' &&
        (state.loaded.kind === 'unit' ? (
          <UnitDetailView u={state.loaded.data} />
        ) : (
          <AmmoDetailView a={state.loaded.data} />
        ))}
    </section>
  );
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
