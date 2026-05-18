// One row in the sidebar list.

import { flagTextureFor } from '../constants';
import type { UnitSummary } from '../types';
import { LazyImage } from './LazyImage';

type Props = {
  u: UnitSummary;
  selected: boolean;
  onClick: () => void;
};

// Group badge types into broad role buckets for color coding so the list is
// scannable at a glance. Anything unrecognized stays neutral.
function badgeClass(type: string | null): string {
  if (!type) return '';
  const t = type.toUpperCase();
  // Submarines (SS, SSN, SSBN, SSGN, SSK, …).
  if (/^SS/.test(t)) return 'role-sub';
  // Carriers / amphibs (CV, CVL, CVN, TAVKR, LPD, LHD, BDK, LST, …).
  if (/^(CV|TAV|LPD|LHD|LHA|LST|BDK|PKR|TAKR)/.test(t)) return 'role-carrier';
  // Surface combatants (FF, FFG, DD, DDG, CG, CGN, BB, SKR, EM, KR, RKR, MPK, BPK).
  if (/^(FF|DD|CG|BB|SKR|EM|KR|RKR|MPK|BPK|MRK)/.test(t)) return 'role-combat';
  // Patrol / fast-attack craft (PT, PB, PTG, PG, PHM).
  if (/^(PT|PB|PG|PHM)/.test(t)) return 'role-patrol';
  // Aux / non-combatants (VT, MV, MS, MSC, AGI, AOR, AGS, AGOR, …).
  if (/^(VT|MV|MS|MSC|AGI|AOR|AGS|AGOR|AKE|AFS)/.test(t)) return 'role-aux';
  // Aircraft / land buckets — keep neutral; they don't show up next to ship badges.
  return '';
}

export function UnitListItem({ u, selected, onClick }: Props) {
  const flag = flagTextureFor(u.nationPrefix);
  const title = `${u.name || u.id}\n${u.nation || '?'} · ${u.id}`;
  const cls = badgeClass(u.type);
  return (
    <button
      type="button"
      className={`list-item${selected ? ' selected' : ''}`}
      data-id={u.id}
      title={title}
      onClick={onClick}
    >
      <div className={`badge ${cls}`}>{u.type || '—'}</div>
      <div className="body">
        <div className="name">{u.name || u.id}</div>
        <div className="sub">
          {flag && <LazyImage name={flag} className="flag" />}
          {`${u.nation || '?'} · ${u.id}`}
        </div>
      </div>
    </button>
  );
}
