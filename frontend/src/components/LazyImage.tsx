// Image that lazy-loads and disappears if the texture is missing.
// For "show a fallback" semantics, callers manage their own failure state
// and just render alternative content.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { imageUrl } from '../api';

type Props = {
  name: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  onError?: () => void;
};

export function LazyImage({ name, alt, className, style, onError }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={imageUrl(name)}
      alt={alt ?? name}
      className={className}
      style={style}
      loading="lazy"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}
