// Tracks whether a given image src has failed to load. Used by all four
// detail-view heroes (unit / ammo / mission / campaign) to collapse their
// image wrappers when the asset 404s or is missing entirely.
//
// Reset semantics: when `src` changes (user navigates to another detail), the
// failure flag is cleared in a render-phase compare so the next render shows
// the new image instead of inheriting the previous unit's failed state.

import { useState } from 'react';

export function useImageLoadState(src: string | null) {
  const [failed, setFailed] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (lastSrc !== src) {
    setLastSrc(src);
    setFailed(false);
  }
  return {
    showImage: !!src && !failed,
    onError: () => setFailed(true),
  };
}
