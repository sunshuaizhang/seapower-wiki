// Detail layout for vessels / aircraft / land_units. Sections appear in this
// order to mirror the legacy app.js layout exactly:
//   hero → stats strip → description → armament + sensors (two columns) →
//   variants → air group → full specs (collapsible) → raw INI (collapsible).

import { KEY_STATS_BY_CATEGORY, specHint } from '../constants';
import type { UnitDetail } from '../types';
import { AirGroup } from './AirGroup';
import { Armament } from './Armament';
import { FullSpecs } from './FullSpecs';
import { Hero } from './Hero';
import { RawDump } from './RawDump';
import { Sensors } from './Sensors';
import { StatsStrip } from './StatsStrip';
import type { Stat } from './StatsStrip';
import { Variants } from './Variants';

export function UnitDetailView({ u }: { u: UnitDetail }) {
  const stats = pickKeyStats(u);
  const hasWeapons = u.weapons && u.weapons.length > 0;
  const hasSensors = u.sensors && u.sensors.length > 0;
  const hasVariants = u.variants && u.variants.length > 0;
  const hasAirGroup = u.airGroup && Object.keys(u.airGroup).length > 0;
  const hasSpecs = u.specs && Object.keys(u.specs).length > 0;
  return (
    <div className="detail-inner">
      <Hero u={u} />
      <StatsStrip stats={stats} />
      <div className="body-sections">
        {u.description && <div className="description-block">{u.description}</div>}
        {(hasWeapons || hasSensors) && (
          <div className="twocol">
            {hasWeapons && <Armament u={u} />}
            {hasSensors && <Sensors u={u} />}
          </div>
        )}
        {hasVariants && <Variants u={u} />}
        {hasAirGroup && <AirGroup u={u} />}
        {hasSpecs && <FullSpecs specs={u.specs} />}
        <RawDump raw={u.raw} />
      </div>
    </div>
  );
}

function pickKeyStats(u: UnitDetail): Stat[] {
  const want = KEY_STATS_BY_CATEGORY[u.category] || [];
  const out: Stat[] = [];
  const specs = u.specs || {};
  for (const [key, label, unit] of want) {
    const v = specs[key];
    if (v === undefined || v === null || v === '') continue;
    out.push({ label, value: String(v), unit, hint: specHint(key, String(v)) });
    if (out.length >= 6) break;
  }
  return out;
}
