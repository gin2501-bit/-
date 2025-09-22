import { describe, expect, it } from 'vitest';
import { determineJudgement, judgementWindows } from './judgement';

describe('determineJudgement', () => {
  it('returns PERFECT for deltas within perfect window', () => {
    expect(determineJudgement(judgementWindows.PERFECT - 0.001)).toBe('PERFECT');
    expect(determineJudgement(-(judgementWindows.PERFECT - 0.001))).toBe('PERFECT');
  });

  it('falls back to GOOD for larger deltas', () => {
    expect(determineJudgement(judgementWindows.GOOD - 0.001)).toBe('GOOD');
  });

  it('returns null outside windows', () => {
    expect(determineJudgement(judgementWindows.GOOD + 0.05)).toBeNull();
  });
});
