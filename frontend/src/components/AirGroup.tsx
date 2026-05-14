// Carried air group for vessels with a flight deck (and land units with helipad).

import type { UnitDetail } from '../types';
import { Section } from './Section';

export function AirGroup({ u }: { u: UnitDetail }) {
  const entries = Object.entries(u.airGroup);
  return (
    <Section title="搭载机队" count={entries.length}>
      <div className="airgroup-list">
        {entries.map(([k, v]) => (
          <div className="airgroup-row" key={k}>
            <span className="ag-name">{k}</span>
            <span className="ag-count">{v}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
