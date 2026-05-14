// Variant / squadron cards (paintjobs + service dates + notes).

import { localizeSlot } from '../constants';
import { formatServiceDate } from '../utils/format';
import type { UnitDetail } from '../types';
import { LazyImage } from './LazyImage';
import { Section } from './Section';

export function Variants({ u }: { u: UnitDetail }) {
  return (
    <Section title="型号 / 涂装" count={u.variants.length}>
      <div className="variant-grid">
        {u.variants.map((v) => {
          const slotLabel = localizeSlot(v.slot);
          const displayName = v.displayName || v.shortName || slotLabel;
          const date = formatServiceDate(v.serviceDate);
          const titleParts = [displayName];
          if (v.slot) titleParts.push(`槽位: ${v.slot}`);
          if (v.nation) titleParts.push(v.nation);
          if (date) titleParts.push(date);
          const metaParts: string[] = [];
          if (v.nation) metaParts.push(v.nation);
          if (date) metaParts.push(date);
          return (
            <div className="variant-card" key={v.slot} title={titleParts.join('\n')}>
              {(v.emblemTexture || v.hullnumberTexture || v.flagTexture) && (
                <div className="thumbs">
                  {v.emblemTexture && (
                    <LazyImage name={v.emblemTexture} className="emblem-thumb" />
                  )}
                  {v.hullnumberTexture && (
                    <LazyImage name={v.hullnumberTexture} className="hull-thumb" />
                  )}
                  {v.flagTexture && (
                    <LazyImage name={v.flagTexture} className="flag-thumb" />
                  )}
                </div>
              )}
              <div className="v-body">
                <div className="v-slot">{slotLabel}</div>
                <div className="v-name">{displayName}</div>
                {metaParts.length > 0 && (
                  <div className="v-meta">{metaParts.join('  ·  ')}</div>
                )}
                {v.notes && <div className="v-notes">{v.notes}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
