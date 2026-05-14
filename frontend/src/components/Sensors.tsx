// Sensor list, with duplicates by (type, systemName) collapsed.

import type { Sensor, UnitDetail } from '../types';
import { Section } from './Section';

export function Sensors({ u }: { u: UnitDetail }) {
  const grouped = new Map<string, { s: Sensor; count: number }>();
  for (const s of u.sensors) {
    const key = `${s.type ?? ''}|${s.systemName ?? ''}`;
    const cur = grouped.get(key);
    if (cur) cur.count++;
    else grouped.set(key, { s, count: 1 });
  }
  return (
    <Section title="传感器 / 电子" count={`${u.sensors.length} 套`}>
      <div className="sensor-list">
        {Array.from(grouped.values()).map(({ s, count }, i) => (
          <div className="sensor-row" key={i}>
            <div className="s-type">{s.type || ''}</div>
            <div className="s-name">
              {count > 1 ? `${count}× ` : ''}
              {s.systemName || '—'}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
