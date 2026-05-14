// Hero banner for unit detail: primary image + name/role/nation + flag + ID tag.

import { useState } from 'react';
import { imageUrl } from '../api';
import { firstServiceYear, specFrom } from '../utils/format';
import type { UnitDetail } from '../types';
import { LazyImage } from './LazyImage';

export function Hero({ u }: { u: UnitDetail }) {
  const [imgFailed, setImgFailed] = useState(false);
  const heroName = u.images?.primary || u.id;
  const flagName = u.images?.flag || null;
  const labelTxt = u.type || u.category.toUpperCase();
  const subBits: string[] = [u.nation || '—'];
  if (u.role) subBits.push(u.role);
  const year = firstServiceYear(u);
  if (year) subBits.push(year);
  const armor = specFrom(u.specs, ['Armor']);
  const rcs = specFrom(u.specs, ['RCS']);

  return (
    <div className={`hero${imgFailed ? ' placeholder' : ''}`}>
      <div className="hero-img-wrap">
        {imgFailed ? (
          '[ 暂无图像 ]'
        ) : (
          <img
            src={imageUrl(heroName)}
            alt={heroName}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className="hero-info">
        <div className="hero-label">{labelTxt}</div>
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
      </div>
      <div className="hero-meta-id">{u.id.toUpperCase()}</div>
    </div>
  );
}
