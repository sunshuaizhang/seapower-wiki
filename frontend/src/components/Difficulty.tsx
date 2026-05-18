// Star rating display for mission/campaign difficulty (0-5 to match the
// game's INI range). Color steps: 0-1 easy (green), 2-3 medium (orange),
// 4-5 hard (red). Filled stars are colored, empties stay faint so the
// rating still reads linearly even when N is unusual.

import { clampDifficulty, DIFFICULTY_MAX } from '../utils/difficulty';

export function Difficulty({ value, showLabel = false }: { value: number; showLabel?: boolean }) {
  const n = clampDifficulty(value);
  const tone = n >= 4 ? 'hard' : n >= 2 ? 'med' : 'easy';
  return (
    <span className={`diff diff-${tone}`} title={`难度 ${n}/${DIFFICULTY_MAX}`}>
      <span className="diff-stars">
        {Array.from({ length: DIFFICULTY_MAX }).map((_, i) => (
          <span key={i} className={i < n ? 'on' : 'off'}>
            ★
          </span>
        ))}
      </span>
      {showLabel && <span className="diff-label">难度 {n}/{DIFFICULTY_MAX}</span>}
    </span>
  );
}
