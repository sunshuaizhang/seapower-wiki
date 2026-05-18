// Pure helpers for the difficulty 0-3 scale. Kept out of Difficulty.tsx so
// React Fast Refresh stays happy (it requires component-only exports).

const MAX = 3;

export function clampDifficulty(value: number): number {
  return Math.max(0, Math.min(MAX, value || 0));
}

export function difficultyStars(value: number): string {
  return '★'.repeat(clampDifficulty(value));
}

export const DIFFICULTY_MAX = MAX;
