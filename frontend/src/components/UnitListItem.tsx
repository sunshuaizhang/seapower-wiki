// One row in the sidebar list.

import { flagTextureFor } from '../constants';
import type { UnitSummary } from '../types';
import { LazyImage } from './LazyImage';

type Props = {
  u: UnitSummary;
  selected: boolean;
  onClick: () => void;
};

export function UnitListItem({ u, selected, onClick }: Props) {
  const flag = flagTextureFor(u.nationPrefix);
  const title = `${u.name || u.id}\n${u.nation || '?'} · ${u.id}`;
  return (
    <div
      className={`list-item${selected ? ' selected' : ''}`}
      data-id={u.id}
      title={title}
      onClick={onClick}
    >
      <div className="badge">{u.type || '—'}</div>
      <div className="body">
        <div className="name">{u.name || u.id}</div>
        <div className="sub">
          {flag && <LazyImage name={flag} className="flag" />}
          {`${u.nation || '?'} · ${u.id}`}
        </div>
      </div>
    </div>
  );
}
