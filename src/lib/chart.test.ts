import { describe, expect, it } from 'vitest';
import { generateChart } from './chart';

describe('generateChart', () => {
  it('creates deterministic charts for identical config', () => {
    const config = { bpm: 120, measures: 4, beatsPerMeasure: 4, resolution: 4, seed: 42 };
    const chartA = generateChart(config);
    const chartB = generateChart(config);

    expect(chartA.notes).toHaveLength(chartB.notes.length);
    chartA.notes.forEach((note, index) => {
      expect(note.lane).toBe(chartB.notes[index]?.lane);
      expect(note.time).toBeCloseTo(chartB.notes[index]?.time ?? 0, 10);
    });
  });

  it('increases note density with higher resolution', () => {
    const low = generateChart({ bpm: 120, measures: 2, beatsPerMeasure: 4, resolution: 2, seed: 1 });
    const high = generateChart({ bpm: 120, measures: 2, beatsPerMeasure: 4, resolution: 8, seed: 1 });

    expect(high.notes.length).toBeGreaterThan(low.notes.length);
  });
});
