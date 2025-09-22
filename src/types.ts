import type { Judgement } from './lib/judgement';

export interface ChartConfig {
  bpm: number;
  measures: number;
  beatsPerMeasure: number;
  resolution: number;
  seed: number;
}

export interface Note {
  id: string;
  lane: number;
  time: number;
}

export type NoteStatus = Judgement | 'pending';

export interface NoteState extends Note {
  status: NoteStatus;
  hitOffset?: number;
}

export interface ChartData {
  notes: Note[];
  duration: number;
  secondsPerBeat: number;
  config: ChartConfig;
}
