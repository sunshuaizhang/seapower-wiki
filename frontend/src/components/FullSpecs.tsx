// Collapsible "complete spec sheet" — every key from UnitDetail.specs broken
// into thematic groups (标识 / 尺寸 / 动力 / 性能 / 特征 / 战术评估 / 其他)
// so a long unit becomes scannable.

import {
  SPEC_GROUP_LABEL,
  SPEC_GROUP_ORDER,
  specGroup,
  specHint,
  specLabel,
} from '../constants';
import type { SpecGroup } from '../constants';
import { formatNumber } from '../utils/format';

export function FullSpecs({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;

  const byGroup = new Map<SpecGroup, Array<[string, string]>>();
  for (const e of entries) {
    const g = specGroup(e[0]);
    let bucket = byGroup.get(g);
    if (!bucket) {
      bucket = [];
      byGroup.set(g, bucket);
    }
    bucket.push(e);
  }

  return (
    <details className="raw">
      <summary>完整参数  ·  共 {entries.length} 项</summary>
      <div style={{ padding: 12 }}>
        {SPEC_GROUP_ORDER.map((g) => {
          const bucket = byGroup.get(g);
          if (!bucket || bucket.length === 0) return null;
          return (
            <div key={g} className="spec-group">
              <div className="spec-group-title">{SPEC_GROUP_LABEL[g]}</div>
              <div className="specs-grid">
                {bucket.map(([k, v]) => {
                  const hint = specHint(k, v);
                  return (
                    <div className="spec" key={k}>
                      <div className="k">
                        {specLabel(k)}
                        {hint && (
                          <span className="hint-mark" title={hint} aria-label={hint}>
                            ?
                          </span>
                        )}
                      </div>
                      <div className="v">{formatNumber(v)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
