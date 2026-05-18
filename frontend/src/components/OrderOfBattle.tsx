// Formations + units roster for a mission detail. The mission INI declares
// each unit in its own [TaskforceNVesselM] section and groups them via
// Taskforce<N>_Formation<M>=slot1,slot2,... | name | pattern | spacing.
// We render side-toggleable formations; each formation shows its name, pattern
// chip, and the slot units as clickable chips that the user can drill into
// (Phase 5 wires the popover; for now click is a no-op).

import { useMemo, useState } from 'react';
import { useApp } from '../state/useApp';
import type { Category, MissionFormation, MissionUnit } from '../types';

type Side = 'player' | 'enemy';

export function OrderOfBattle({
  formations,
  units,
}: {
  formations: MissionFormation[];
  units: MissionUnit[];
}) {
  const [side, setSide] = useState<Side>('player');

  const sideFormations = useMemo(
    () => formations.filter((f) => f.side === side),
    [formations, side],
  );
  // Slot → unit lookup so we can resolve the unitId / variant / missionType per chip.
  const bySlot = useMemo(() => {
    const m = new Map<string, MissionUnit>();
    for (const u of units) m.set(u.slot, u);
    return m;
  }, [units]);

  // Units that aren't claimed by any formation (rare) still get rendered as a
  // "未编入" pseudo-formation at the bottom so we never silently drop data.
  const orphans = useMemo(() => {
    const claimed = new Set<string>();
    for (const f of formations) for (const s of f.unitSlots) claimed.add(s);
    return units.filter((u) => u.side === side && !claimed.has(u.slot));
  }, [formations, units, side]);

  const playerCount = formations.filter((f) => f.side === 'player').length;
  const enemyCount = formations.filter((f) => f.side === 'enemy').length;

  return (
    <div className="oob">
      <div className="oob-tabs">
        <button
          type="button"
          className={`oob-tab${side === 'player' ? ' active' : ''}`}
          onClick={() => setSide('player')}
        >
          我方 · {playerCount} 编队
        </button>
        <button
          type="button"
          className={`oob-tab${side === 'enemy' ? ' active' : ''}`}
          onClick={() => setSide('enemy')}
        >
          敌方 · {enemyCount} 编队
        </button>
      </div>
      <div className="oob-body">
        {sideFormations.map((f) => (
          <FormationBlock
            key={`${f.side}|${f.name ?? ''}|${f.unitSlots.join(',')}`}
            formation={f}
            bySlot={bySlot}
          />
        ))}
        {orphans.length > 0 && (
          <FormationBlock
            formation={{ side, name: '未编入', pattern: null, unitSlots: orphans.map((u) => u.slot) }}
            bySlot={bySlot}
          />
        )}
        {sideFormations.length === 0 && orphans.length === 0 && (
          <div className="oob-empty">无{side === 'player' ? '我' : '敌'}方编队</div>
        )}
      </div>
    </div>
  );
}

function FormationBlock({
  formation,
  bySlot,
}: {
  formation: MissionFormation;
  bySlot: Map<string, MissionUnit>;
}) {
  return (
    <div className="formation">
      <div className="formation-head">
        <span className="formation-name">{formation.name || '未命名编队'}</span>
        {formation.pattern && <span className="formation-pat">{formation.pattern}</span>}
        <span className="formation-count">{formation.unitSlots.length} 单位</span>
      </div>
      <div className="formation-units">
        {formation.unitSlots.map((slot) => {
          const u = bySlot.get(slot);
          if (!u) return (
            <span key={slot} className="unit-chip missing" title={slot}>
              {slot}
            </span>
          );
          return <UnitChip key={slot} unit={u} />;
        })}
      </div>
    </div>
  );
}

function UnitChip({ unit }: { unit: MissionUnit }) {
  const { openUnitPopover, unitNames } = useApp();
  // Prefer the language-file display name (e.g. "提康德罗加") over the raw game
  // id; explicit nameOverride from the mission INI still wins over both.
  const display = unit.nameOverride || unitNames[unit.unitId] || unit.unitId;
  const visualCat = inferVisualCategory(unit.slot);
  const targetCat = resolveCategory(visualCat);
  return (
    <button
      type="button"
      className={`unit-chip cat-${visualCat}`}
      title={`${unit.unitId}${unit.variant ? ' · ' + unit.variant : ''}${unit.missionType ? ' · ' + unit.missionType : ''}`}
      onClick={(e) => openUnitPopover(e.currentTarget, unit.unitId, targetCat)}
    >
      <span className="unit-chip-cat">{catLabel(visualCat)}</span>
      <span className="unit-chip-name">{display}</span>
      {unit.missionType && unit.missionType !== '' && (
        <span className="unit-chip-task">{unit.missionType}</span>
      )}
    </button>
  );
}

// Slot suffix tells us the visual category bucket: TaskforceNVessel1,
// TaskforceNAircraft1, etc. Sub and Vessel render with different left borders
// but both live in the vessels/ data folder — resolveCategory handles that.
function inferVisualCategory(slot: string): string {
  if (/Aircraft\d+$/.test(slot)) return 'aircraft';
  if (/Helicopter\d+$/.test(slot)) return 'aircraft';
  if (/Submarine\d+$/.test(slot)) return 'sub';
  if (/LandUnit\d+$/.test(slot)) return 'land';
  return 'vessel';
}

function resolveCategory(visual: string): Category {
  if (visual === 'aircraft') return 'aircraft';
  if (visual === 'land') return 'land_units';
  return 'vessels'; // sub + surface vessel both live in vessels/
}

function catLabel(cat: string): string {
  return cat === 'vessel'   ? '舰'
       : cat === 'sub'      ? '潜'
       : cat === 'aircraft' ? '机'
       : cat === 'land'     ? '陆'
       : '?';
}
