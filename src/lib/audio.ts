import type { ChartData } from '../types';

const PULSE_LENGTH = 0.12;
const PULSE_FREQUENCY = 880;

const isAudioSupported = () =>
  typeof window !== 'undefined' &&
  (window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContext }).webkitAudioContext);

const buildMetronomeBuffer = (context: AudioContext, chart: ChartData): AudioBuffer => {
  const lastNoteTime = chart.notes.length > 0 ? chart.notes[chart.notes.length - 1].time : 0;
  const duration = Math.max(chart.duration + 1, lastNoteTime + 1, 3);
  const totalSamples = Math.ceil(duration * context.sampleRate);
  const buffer = context.createBuffer(1, totalSamples, context.sampleRate);
  const data = buffer.getChannelData(0);

  chart.notes.forEach((note, index) => {
    const startSample = Math.floor(note.time * context.sampleRate);
    const length = Math.floor(PULSE_LENGTH * context.sampleRate);
    for (let i = 0; i < length && startSample + i < data.length; i += 1) {
      const t = i / context.sampleRate;
      const envelope = Math.exp(-8 * t);
      const accentBoost = index % (chart.config.beatsPerMeasure * chart.config.resolution) === 0 ? 1.2 : 1;
      data[startSample + i] += Math.sin(2 * Math.PI * PULSE_FREQUENCY * t) * envelope * 0.4 * accentBoost;
    }
  });

  return buffer;
};

export class AudioEngine {
  private context: AudioContext | null = null;

  private buffer: AudioBuffer | null = null;

  private source: AudioBufferSourceNode | null = null;

  private scheduledStart = 0;

  private async ensureContext(): Promise<AudioContext | null> {
    if (!isAudioSupported()) {
      return null;
    }

    if (!this.context) {
      const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.context = new Constructor();
    }

    await this.context.resume();
    return this.context;
  }

  async prepare(chart: ChartData): Promise<void> {
    const context = await this.ensureContext();
    if (!context) {
      return;
    }
    this.stop();
    this.buffer = buildMetronomeBuffer(context, chart);
  }

  async play(): Promise<void> {
    const context = await this.ensureContext();
    if (!context || !this.buffer) {
      return;
    }

    this.stop();

    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (this.source === source) {
        this.source = null;
      }
    };

    const startAt = context.currentTime + 0.1;
    source.start(startAt);
    this.source = source;
    this.scheduledStart = startAt;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (error) {
        // ignore stop errors
      }
      this.source.disconnect();
      this.source = null;
    }
    this.scheduledStart = 0;
  }

  getCurrentTime(): number {
    if (!this.context || !this.source) {
      return 0;
    }
    return Math.max(0, this.context.currentTime - this.scheduledStart);
  }
}
