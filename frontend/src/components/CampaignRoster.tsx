// Two-level fold for a sandbox campaign's player roster: port (collapsed by
// default) → groups (auto-expanded once the port is open) → unit chips. Each
// port shows a summary chip with group count + total unit count so the user
// can scan the whole fleet without expanding everything.

import { useApp } from '../state/useApp';
import type { CampaignPortGroup, CampaignUnitRow } from '../types';

export function CampaignRoster({ ports }: { ports: CampaignPortGroup[] }) {
  if (ports.length === 0) {
    return <div className="roster-empty">本战役没有玩家舰艇编成数据。</div>;
  }
  return (
    <div className="roster">
      {ports.map((p) => {
        const groupCount = p.groups.length;
        const unitCount = p.groups.reduce((n, g) => n + g.unitCount, 0);
        return (
          <details className="roster-port" key={p.port}>
            <summary>
              <span className="roster-port-caret">▶</span>
              <span className="roster-port-name">{p.port}</span>
              <span className="roster-port-stat">{groupCount} 群组 · {unitCount} 单位</span>
            </summary>
            <div className="roster-port-body">
              {p.groups.map((g) => (
                <div key={g.name} className="roster-group">
                  <div className="roster-group-head">
                    <span className="roster-group-name">{g.name}</span>
                    <span className="roster-group-count">{g.unitCount} 单位</span>
                  </div>
                  <div className="roster-group-units">
                    {g.units.map((u, i) => (
                      <RosterUnit key={`${u.unitId}-${u.hullNumber}-${i}`} unit={u} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function RosterUnit({ unit }: { unit: CampaignUnitRow }) {
  const { openUnitPopover, unitNames } = useApp();
  // missionType "False" in the game data means "not deployed at start" —
  // surface that as a dim styling so the player can see which ships are
  // available vs. tasked from day one.
  const idle = unit.missionType === '' || unit.missionType === 'False';
  const display = unitNames[unit.unitId] || unit.unitId;
  return (
    <button
      type="button"
      className={`roster-unit${idle ? ' idle' : ''}`}
      title={`${unit.unitId}${unit.hullNumber ? ' #' + unit.hullNumber : ''}${unit.missionType ? ' · ' + unit.missionType : ''}`}
      onClick={(e) => openUnitPopover(e.currentTarget, unit.unitId, 'vessels')}
    >
      <span className="roster-unit-id">{display}</span>
      {unit.hullNumber && <span className="roster-unit-hull">#{unit.hullNumber}</span>}
      {!idle && <span className="roster-unit-task">{unit.missionType}</span>}
    </button>
  );
}
