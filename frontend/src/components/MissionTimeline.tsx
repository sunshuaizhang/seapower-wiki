// Vertical timeline for a Linear campaign's mission sequence.
//
// UX rationale:
//   - Horizontal steppers cap content width per node, awful for missions with
//     rich descriptions + objective lists.
//   - Click-to-expand adds friction to users who came here precisely to read
//     the mission content.
//   - Vertical layout flows top-down, scales to any sequence length, and lets
//     each step have a full-width content card with comfortable text size.
//
// Branch steps (two missions sharing an order number, e.g. 4A / 4B) render
// side-by-side inside the same step row to communicate "pick one of these"
// rather than the misleading vertical stacking of the previous version.

import type { TimelineMission } from '../types';
import { Difficulty } from './Difficulty';
import { OrderOfBattle } from './OrderOfBattle';

export function MissionTimeline({ missions }: { missions: TimelineMission[] }) {
  // Bucket by order number — branches share an order, single missions don't.
  const byOrder = new Map<number, TimelineMission[]>();
  for (const m of missions) {
    const arr = byOrder.get(m.order) ?? [];
    arr.push(m);
    byOrder.set(m.order, arr);
  }
  const orders = Array.from(byOrder.keys()).sort((a, b) => a - b);

  return (
    <ol className="timeline-v">
      {orders.map((ord, i) => {
        const slot = byOrder
          .get(ord)!
          .slice()
          .sort((a, b) => (a.branch ?? '').localeCompare(b.branch ?? ''));
        const isBranch = slot.length > 1;
        const isLast = i === orders.length - 1;
        return (
          <li
            key={ord}
            className={`tv-step${isLast ? ' is-last' : ''}${isBranch ? ' is-branch' : ''}`}
          >
            <div className="tv-marker">
              <div className="tv-num">{ord}</div>
            </div>
            <div className="tv-body">
              {isBranch ? (
                <>
                  <div className="tv-branch-label">分支选择 · 二选一</div>
                  <div className="tv-branch-grid">
                    {slot.map((m, j) => (
                      <span key={`${m.missionId}|${m.branch ?? ''}`} className="tv-branch-cell">
                        <MissionCard mission={m} />
                        {j < slot.length - 1 && <span className="tv-or">或</span>}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <MissionCard mission={slot[0]} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MissionCard({ mission: m }: { mission: TimelineMission }) {
  const desc = m.description ?? m.summary;
  const hasOOB =
    (m.formations && m.formations.length > 0) ||
    (m.units && m.units.length > 0);
  return (
    <article className={`tv-card${m.branch ? ' has-branch' : ''}`}>
      <header className="tv-card-head">
        <div className="tv-card-title">
          {m.branch && <span className="tv-card-branch">{m.branch}</span>}
          <h4 className="tv-card-name">{m.name}</h4>
        </div>
        <div className="tv-card-meta">
          {m.date && <span className="tv-card-date">{m.date}</span>}
          <Difficulty value={m.difficulty} />
        </div>
      </header>
      {desc && <div className="tv-card-desc">{desc}</div>}
      {m.objectives && m.objectives.length > 0 && (
        <div className="tv-card-objs">
          <div className="tv-card-objs-h">◆ 任务目标</div>
          <ul>
            {m.objectives.map((o, i) => (
              <li key={i}>
                <span className="objective-check">☐</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasOOB && (
        <div className="tv-card-oob">
          <div className="tv-card-objs-h">◆ 战斗序列</div>
          <OrderOfBattle formations={m.formations} units={m.units} />
        </div>
      )}
    </article>
  );
}
