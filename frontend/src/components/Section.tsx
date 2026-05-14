// Small reusable container with the "▰ TITLE  · count" header used by the
// detail panel's body sections.

import type { ReactNode } from 'react';

type Props = {
  title: string;
  count?: number | string;
  children: ReactNode;
};

export function Section({ title, count, children }: Props) {
  return (
    <div className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {count !== undefined && <div className="count">{String(count)}</div>}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}
