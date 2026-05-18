// Hero banner for unit detail: primary image on the left, identity column on
// the right (label / name / nation+role+year / flag+armor+RCS chips). The
// previous version stacked them vertically which felt visually disconnected.

import { imageUrl } from '../api';
import { typeHint } from '../constants';
import { firstServiceYear, specFrom } from '../utils/format';
import type { UnitDetail } from '../types';
import { useImageLoadState } from '../utils/useImageLoadState';
import { LazyImage } from './LazyImage';

export function Hero({ u }: { u: UnitDetail }) {
  const heroName = u.images?.primary || u.id;
  const heroSrc = imageUrl(heroName);
  // Same image-load pattern as mission/campaign heroes — fall back to a text
  // placeholder when the image 404s.
  const { showImage, onError } = useImageLoadState(heroSrc);
  const flagName = u.images?.flag || null;
  const labelTxt = u.type || u.category.toUpperCase();
  // Type tooltip is keyed by the short form (e.g. "DDG"). u.shortName carries
  // just that; u.type is the combined "DDG — 导弹驱逐舰" display string.
  const tHint = typeHint(u.shortName);
  const subBits: string[] = [u.nation || '—'];
  if (u.role) subBits.push(u.role);
  const year = firstServiceYear(u);
  if (year) subBits.push(year);
  const armor = specFrom(u.specs, ['Armor']);
  const rcs = specFrom(u.specs, ['RCS']);

  return (
    <div className={`hero${showImage ? '' : ' placeholder'}`}>
      <div className="hero-img-wrap">
        {showImage ? (
          <img src={heroSrc} alt={heroName} loading="lazy" onError={onError} />
        ) : (
          '[ 暂无图像 ]'
        )}
      </div>
      <div className="hero-info">
        <div className="hero-label">
          {labelTxt}
          {tHint && (
            <span className="hint-mark" title={tHint} aria-label={tHint}>
              ?
            </span>
          )}
        </div>
        <h1 className="hero-name">{u.name || u.id}</h1>
        <div className="hero-sub">{subBits.join('  ·  ')}</div>
        <div className="hero-badges">
          {flagName && (
            <div className="badge-chip">
              <LazyImage name={flagName} />
              {u.nation || ''}
            </div>
          )}
          {armor && <div className="badge-chip">ARMOR · {armor}</div>}
          {rcs && <div className="badge-chip">RCS · {rcs}</div>}
        </div>
        <div className="hero-meta-id">{u.id.toUpperCase()}</div>
      </div>
    </div>
  );
}
