// Detail layout for the ammunition category. Same overall shape as the unit
// detail (hero → stats strip → description → specs → raw) but a different
// data model (no weapons / sensors / variants).

import { imageUrl } from '../api';
import { AMMO_STAT_KEYS } from '../constants';
import type { AmmunitionDetail } from '../types';
import { useImageLoadState } from '../utils/useImageLoadState';
import { FullSpecs } from './FullSpecs';
import { RawDump } from './RawDump';
import { StatsStrip } from './StatsStrip';
import type { Stat } from './StatsStrip';

export function AmmoDetailView({ a }: { a: AmmunitionDetail }) {
  const heroSrc = imageUrl(a.id);
  const { showImage, onError } = useImageLoadState(heroSrc);
  const stats = pickAmmoStats(a);
  const displayName =
    a.codename && a.codename !== a.name
      ? `${a.name || a.id}  “${a.codename}”`
      : a.name || a.id;
  const subBits: string[] = [a.nation || '—'];
  if (a.type) subBits.push(a.type);
  if (a.targetType) subBits.push(a.targetType);
  const hasSpecs = a.specs && Object.keys(a.specs).length > 0;

  return (
    <div className="detail-inner">
      <div className={`hero${showImage ? '' : ' placeholder'}`}>
        <div className="hero-img-wrap">
          {showImage ? (
            <img src={heroSrc} alt={a.id} loading="lazy" onError={onError} />
          ) : (
            '[ 暂无图像 ]'
          )}
        </div>
        <div className="hero-info">
          {a.category && <div className="hero-label">{a.category}</div>}
          <h1 className="hero-name">{displayName}</h1>
          <div className="hero-sub">{subBits.join('  ·  ')}</div>
        </div>
        <div className="hero-meta-id">{a.id.toUpperCase()}</div>
      </div>
      <StatsStrip stats={stats} />
      <div className="body-sections">
        {a.description && <div className="description-block">{a.description}</div>}
        {hasSpecs && <FullSpecs specs={a.specs} />}
        <RawDump raw={a.raw} />
      </div>
    </div>
  );
}

function pickAmmoStats(a: AmmunitionDetail): Stat[] {
  const out: Stat[] = [];
  if (!a.specs) return out;
  for (const [key, label, unit] of AMMO_STAT_KEYS) {
    const v = a.specs[key];
    if (v === undefined || v === null || v === '') continue;
    out.push({ label, value: String(v), unit });
    if (out.length >= 6) break;
  }
  return out;
}
