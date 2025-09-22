import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameBoard from './components/GameBoard';
import { AudioEngine } from './lib/audio';
import { generateChart } from './lib/chart';
import { determineJudgement, judgementWeights, judgementWindows, type Judgement } from './lib/judgement';
import type { ChartConfig, ChartData, NoteState } from './types';

const laneKeyMap: Record<string, number> = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3
};

const defaultConfig: ChartConfig = {
  bpm: 140,
  measures: 8,
  beatsPerMeasure: 4,
  resolution: 4,
  seed: 2024
};

interface GameStats {
  combo: number;
  maxCombo: number;
  counts: Record<Judgement, number>;
  score: number;
  totalJudged: number;
  accuracy: number;
  lastJudgement: Judgement | null;
}

const createInitialStats = (): GameStats => ({
  combo: 0,
  maxCombo: 0,
  counts: {
    PERFECT: 0,
    GREAT: 0,
    GOOD: 0,
    MISS: 0
  },
  score: 0,
  totalJudged: 0,
  accuracy: 100,
  lastJudgement: null
});

const toNoteState = (chart: ChartData): NoteState[] =>
  chart.notes.map((note) => ({
    ...note,
    status: 'pending' as const
  }));

const formatAccuracy = (value: number) => `${value.toFixed(2)}%`;

function App() {
  const [chartConfig, setChartConfig] = useState<ChartConfig>(defaultConfig);
  const [chart, setChart] = useState<ChartData>(() => generateChart(defaultConfig));
  const [noteStates, setNoteStates] = useState<NoteState[]>(() => toNoteState(chart));
  const [stats, setStats] = useState<GameStats>(() => createInitialStats());
  const [scrollSpeed, setScrollSpeed] = useState(1.1);
  const [offset, setOffset] = useState(0);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [pressed, setPressed] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  const totalNotes = chart.notes.length;

  useEffect(() => {
    setChart(generateChart(chartConfig));
  }, [chartConfig]);

  useEffect(() => {
    setNoteStates(toNoteState(chart));
    setStats(createInitialStats());
    setCurrentTime(0);
    setStarted(false);

    const prepare = async () => {
      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioEngine();
      }
      try {
        await audioEngineRef.current.prepare(chart);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to prepare audio', error);
      }
    };

    prepare();
  }, [chart]);

  const offsetSeconds = useMemo(() => offset / 1000, [offset]);

  const applyJudgement = useCallback(
    (judgement: Judgement) => {
      setStats((previous) => {
        const nextCounts = {
          ...previous.counts,
          [judgement]: previous.counts[judgement] + 1
        };
        const nextCombo = judgement === 'MISS' ? 0 : previous.combo + 1;
        const nextMaxCombo = Math.max(previous.maxCombo, nextCombo);
        const nextTotal = previous.totalJudged + 1;
        const nextScore = previous.score + judgementWeights[judgement];
        const accuracy = nextTotal === 0 ? 100 : (nextScore / nextTotal) * 100;

        return {
          combo: nextCombo,
          maxCombo: nextMaxCombo,
          counts: nextCounts,
          score: nextScore,
          totalJudged: nextTotal,
          accuracy,
          lastJudgement: judgement
        };
      });
    },
    [setStats]
  );

  const markMisses = useCallback(
    (now: number) => {
      const expired: NoteState[] = [];
      setNoteStates((previous) => {
        let mutated = false;
        const next = previous.map((note) => {
          if (note.status !== 'pending') {
            return note;
          }
          if (note.time + judgementWindows.GOOD < now + offsetSeconds) {
            mutated = true;
            const missed: NoteState = {
              ...note,
              status: 'MISS',
              hitOffset: now + offsetSeconds - note.time
            };
            expired.push(missed);
            return missed;
          }
          return note;
        });
        if (!mutated) {
          return previous;
        }
        return next;
      });
      if (expired.length > 0) {
        expired.forEach(() => applyJudgement('MISS'));
      }
    },
    [applyJudgement, offsetSeconds]
  );

  const handleHit = useCallback(
    (lane: number) => {
      if (!started) {
        return;
      }
      const now = currentTimeRef.current + offsetSeconds;
      let recordedJudgement: Judgement | null = null;

      setNoteStates((previous) => {
        let targetIndex = -1;
        let targetDelta = Number.POSITIVE_INFINITY;

        previous.forEach((note, index) => {
          if (note.lane !== lane || note.status !== 'pending') {
            return;
          }
          const delta = note.time - now;
          if (Math.abs(delta) < Math.abs(targetDelta)) {
            targetDelta = delta;
            targetIndex = index;
          }
        });

        if (targetIndex === -1) {
          recordedJudgement = 'MISS';
          return previous;
        }

        const judgement = determineJudgement(targetDelta);
        if (!judgement) {
          recordedJudgement = 'MISS';
          return previous;
        }

        const next = [...previous];
        const target = previous[targetIndex];
        next[targetIndex] = {
          ...target,
          status: judgement,
          hitOffset: targetDelta
        };
        recordedJudgement = judgement;
        return next;
      });

      if (recordedJudgement) {
        applyJudgement(recordedJudgement);
      }
    },
    [applyJudgement, offsetSeconds, started]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const lane = laneKeyMap[event.code];
      if (lane === undefined) {
        return;
      }
      event.preventDefault();
      setPressed((previous) => {
        if (previous[lane]) {
          return previous;
        }
        return { ...previous, [lane]: true };
      });
      handleHit(lane);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const lane = laneKeyMap[event.code];
      if (lane === undefined) {
        return;
      }
      event.preventDefault();
      setPressed((previous) => ({ ...previous, [lane]: false }));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleHit]);

  useEffect(() => {
    if (!started) {
      return;
    }
    let raf = 0;
    const loop = () => {
      const now = audioEngineRef.current?.getCurrentTime() ?? currentTimeRef.current;
      setCurrentTime(now);
      markMisses(now);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [markMisses, started]);

  const startGame = async () => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine();
    }
    try {
      await audioEngineRef.current.prepare(chart);
      await audioEngineRef.current.play();
      setNoteStates(toNoteState(chart));
      setStats(createInitialStats());
      setCurrentTime(0);
      setStarted(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to start audio context', error);
    }
  };

  const stopGame = () => {
    audioEngineRef.current?.stop();
    setStarted(false);
    setCurrentTime(0);
  };

  const onConfigChange = (partial: Partial<ChartConfig>) => {
    setChartConfig((previous) => ({ ...previous, ...partial }));
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 p-6">
      <header className="flex w-full max-w-5xl flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rhythm Flow</h1>
          <p className="text-sm text-slate-300">
            D/F/J/Kでプレイ。メトロノームトラックに合わせて4レーンの譜面を自動生成します。
          </p>
        </div>
        <section className="grid grid-cols-1 gap-4 rounded-xl bg-slate-800/40 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">BPM</span>
            <input
              type="number"
              className="rounded border border-slate-600 bg-slate-900 p-2"
              value={chartConfig.bpm}
              min={60}
              max={220}
              onChange={(event) => onConfigChange({ bpm: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">小節数</span>
            <input
              type="number"
              className="rounded border border-slate-600 bg-slate-900 p-2"
              value={chartConfig.measures}
              min={1}
              max={32}
              onChange={(event) => onConfigChange({ measures: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">拍子</span>
            <input
              type="number"
              className="rounded border border-slate-600 bg-slate-900 p-2"
              value={chartConfig.beatsPerMeasure}
              min={2}
              max={7}
              onChange={(event) => onConfigChange({ beatsPerMeasure: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">分解能</span>
            <select
              className="rounded border border-slate-600 bg-slate-900 p-2"
              value={chartConfig.resolution}
              onChange={(event) => onConfigChange({ resolution: Number(event.target.value) })}
            >
              <option value={2}>8分</option>
              <option value={4}>16分</option>
              <option value={6}>24分</option>
              <option value={8}>32分</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">シード</span>
            <input
              type="number"
              className="rounded border border-slate-600 bg-slate-900 p-2"
              value={chartConfig.seed}
              onChange={(event) => onConfigChange({ seed: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">オフセット (ms)</span>
            <input
              type="range"
              min={-120}
              max={120}
              value={offset}
              onChange={(event) => setOffset(Number(event.target.value))}
            />
            <span className="text-xs text-slate-400">{offset}ms</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-slate-300">スクロール速度</span>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              value={scrollSpeed}
              onChange={(event) => setScrollSpeed(Number(event.target.value))}
            />
            <span className="text-xs text-slate-400">x{scrollSpeed.toFixed(1)}</span>
          </label>
          <div className="flex items-end justify-between gap-2">
            <button
              type="button"
              onClick={startGame}
              className="flex-1 rounded bg-sky-500 px-3 py-2 font-semibold text-slate-900 transition hover:bg-sky-400"
            >
              スタート
            </button>
            <button
              type="button"
              onClick={stopGame}
              className="rounded border border-slate-600 px-3 py-2 text-slate-200 transition hover:bg-slate-700"
            >
              ストップ
            </button>
          </div>
        </section>
      </header>

      <main className="flex w-full max-w-5xl flex-col items-center gap-4">
        <GameBoard
          notes={noteStates}
          currentTime={currentTime}
          offsetSeconds={offsetSeconds}
          scrollSpeed={scrollSpeed}
          pressedLanes={pressed}
        />
        <section className="grid w-full max-w-3xl grid-cols-2 gap-4 rounded-xl bg-slate-800/40 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-400">コンボ</p>
            <p className="text-2xl font-semibold text-white">{stats.combo}</p>
            <p className="text-xs text-slate-400">MAX {stats.maxCombo}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">判定</p>
            <ul className="space-y-1 text-xs text-slate-300">
              <li>PERFECT: {stats.counts.PERFECT}</li>
              <li>GREAT: {stats.counts.GREAT}</li>
              <li>GOOD: {stats.counts.GOOD}</li>
              <li>MISS: {stats.counts.MISS}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">精度</p>
            <p className="text-2xl font-semibold text-white">{formatAccuracy(stats.accuracy)}</p>
            <p className="text-xs text-slate-400">{stats.totalJudged} / {totalNotes} notes</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">ラスト判定</p>
            <p className="text-2xl font-semibold text-sky-300">{stats.lastJudgement ?? '-'}</p>
            <p className="text-xs text-slate-400">オフセット {offset}ms</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
