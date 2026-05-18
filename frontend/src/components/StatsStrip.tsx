// 4-6 big-number cards across the top of the detail view.

import { formatNumber } from '../utils/format';

export type Stat = { label: string; value: string; unit: string; hint?: string };

export function StatsStrip({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <div className="stats-strip">
      {stats.map((s, i) => (
        <div className="stat-card" key={i}>
          <div className="label">
            {s.label}
            {s.hint && (
              <span className="hint-mark" title={s.hint} aria-label={s.hint}>
                ?
              </span>
            )}
          </div>
          <div className="value">
            {formatNumber(s.value)}
            {s.unit && <span className="unit">{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
