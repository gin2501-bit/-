import type { ChartConfig, ChartData, Note } from '../types';

const lanePattern = [0, 1, 2, 3, 2, 1];

const createRng = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export const generateChart = (config: ChartConfig): ChartData => {
  const beatsPerMeasure = Math.max(1, Math.floor(config.beatsPerMeasure));
  const resolution = Math.max(1, Math.floor(config.resolution));
  const totalSteps = config.measures * beatsPerMeasure * resolution;
  const secondsPerBeat = 60 / config.bpm;
  const secondsPerStep = secondsPerBeat / resolution;
  const rng = createRng(config.seed);

  const notes: Note[] = [];

  for (let step = 0; step < totalSteps; step += 1) {
    const time = step * secondsPerStep;
    const isDownbeat = step % resolution === 0;
    const lane = lanePattern[step % lanePattern.length];

    // Always place a note on strong beats to keep the rhythm predictable.
    if (isDownbeat) {
      notes.push({ id: `n-${step}-${lane}`, lane, time });
      // Add a supporting chord on alternating measures.
      if ((Math.floor(step / (beatsPerMeasure * resolution)) + lane) % 2 === 0) {
        const pairedLane = (lane + 2) % 4;
        notes.push({ id: `n-${step}-${pairedLane}`, lane: pairedLane, time });
      }
      continue;
    }

    // For offbeats use deterministic pseudo randomness to add syncopation.
    const probability = 0.35 + (lane / 10);
    if (rng() < probability) {
      const offsetLane = (lane + (rng() > 0.5 ? 1 : 3)) % 4;
      notes.push({ id: `n-${step}-${offsetLane}`, lane: offsetLane, time });
    }
  }

  notes.sort((a, b) => a.time - b.time || a.lane - b.lane);

  const lastTime = notes.length > 0 ? notes[notes.length - 1].time : totalSteps * secondsPerStep;

  return {
    notes,
    duration: lastTime + 2,
    secondsPerBeat,
    config: {
      bpm: config.bpm,
      measures: config.measures,
      beatsPerMeasure,
      resolution,
      seed: config.seed
    }
  };
};
