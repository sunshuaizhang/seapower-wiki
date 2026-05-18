// Top bar: brand on the left, current-category badge + data-source path on the
// right. Category tabs live in the sidebar now so the bar is purely status.

import { DOMAIN_LABELS, DOMAIN_OF, TAB_LABELS } from '../constants';
import { useApp } from '../state/useApp';
import type { GameVersion } from '../types';

type Props = {
  /** StreamingAssets directory the backend is reading from (from /api/meta). */
  streamingAssets: string;
  /** Parsed first entry of the game's changelog.txt — tells users which
   *  Sea Power patch the wiki data was captured from. */
  gameVersion?: GameVersion;
};

export function Topbar({ streamingAssets, gameVersion }: Props) {
  const { category, categoryCount } = useApp();
  const catLabel = TAB_LABELS.find((t) => t.cat === category)?.label ?? category;
  const domainLabel = DOMAIN_LABELS[DOMAIN_OF[category]];
  // Long Windows paths don't fit the topbar; show only the trailing segments
  // and keep the full string in the tooltip.
  const shortPath = tailPath(streamingAssets, 3);
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="返回首页">
        <span className="insignia">⚓</span>
        <div className="brand-text">
          <div className="title">SEA POWER</div>
          <div className="subtitle">FIELD INTEL</div>
        </div>
      </a>
      <div className="topbar-meta">
        <div className="topbar-cell">
          <span className="topbar-cell-label">当前</span>
          <span className="topbar-cell-domain">{domainLabel}</span>
          <span className="topbar-cell-sep">›</span>
          <span className="topbar-cell-value">{catLabel}</span>
          {categoryCount !== null && (
            <span className="topbar-cell-suffix">{categoryCount}</span>
          )}
        </div>
        {gameVersion && (
          <div
            className="topbar-cell"
            title={`Sea Power v${gameVersion.version}  ·  Build #${gameVersion.build}  ·  ${gameVersion.date}`}
          >
            <span className="topbar-cell-label">游戏版本</span>
            <span className="topbar-cell-value">v{gameVersion.version}</span>
            <span className="topbar-cell-suffix">#{gameVersion.build}</span>
          </div>
        )}
        {streamingAssets && (
          <div className="topbar-cell" title={streamingAssets}>
            <span className="topbar-cell-label">数据源</span>
            <code className="topbar-cell-path">{shortPath}</code>
          </div>
        )}
      </div>
    </header>
  );
}

function tailPath(p: string, segments: number): string {
  if (!p) return '';
  const norm = p.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = norm.split('/').filter(Boolean);
  if (parts.length <= segments) return norm;
  return '…/' + parts.slice(-segments).join('/');
}
