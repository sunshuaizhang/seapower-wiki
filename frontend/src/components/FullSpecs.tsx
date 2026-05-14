// Collapsible "complete spec sheet" — every key from UnitDetail.specs in a grid.

import { specLabel } from '../constants';

export function FullSpecs({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;
  return (
    <details className="raw">
      <summary>完整参数  ·  共 {entries.length} 项</summary>
      <div className="specs-grid" style={{ padding: 12 }}>
        {entries.map(([k, v]) => (
          <div className="spec" key={k}>
            <div className="k">{specLabel(k)}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>
    </details>
  );
}
