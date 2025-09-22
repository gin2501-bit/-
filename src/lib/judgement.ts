export type Judgement = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export const judgementWindows = {
  PERFECT: 0.05,
  GREAT: 0.1,
  GOOD: 0.16
} as const;

export const judgementWeights: Record<Judgement, number> = {
  PERFECT: 1,
  GREAT: 0.75,
  GOOD: 0.5,
  MISS: 0
};

export const determineJudgement = (deltaSeconds: number): Judgement | null => {
  const distance = Math.abs(deltaSeconds);
  if (distance <= judgementWindows.PERFECT) {
    return 'PERFECT';
  }
  if (distance <= judgementWindows.GREAT) {
    return 'GREAT';
  }
  if (distance <= judgementWindows.GOOD) {
    return 'GOOD';
  }
  return null;
};
