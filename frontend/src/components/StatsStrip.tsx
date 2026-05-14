// 4-6 big-number cards across the top of the detail view.

export type Stat = { label: string; value: string; unit: string };

export function StatsStrip({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <div className="stats-strip">
      {stats.map((s, i) => (
        <div className="stat-card" key={i}>
          <div className="label">{s.label}</div>
          <div className="value">
            {s.value}
            {s.unit && <span className="unit">{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
