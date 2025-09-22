import type { NoteState } from '../types';

const laneColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171'];
const keyLabels = ['D', 'F', 'J', 'K'];
const boardHeight = 520;
const judgementLine = boardHeight - 80;

interface GameBoardProps {
  notes: NoteState[];
  currentTime: number;
  offsetSeconds: number;
  scrollSpeed: number;
  pressedLanes: Record<number, boolean>;
}

const GameBoard = ({ notes, currentTime, offsetSeconds, scrollSpeed, pressedLanes }: GameBoardProps) => {
  const pixelsPerSecond = 260 * scrollSpeed;

  return (
    <div className="relative flex w-full max-w-3xl gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-lg">
      {Array.from({ length: 4 }).map((_, lane) => (
        <div
          key={lane}
          className="relative flex-1 overflow-hidden rounded-xl border bg-slate-950/60"
          style={{ height: boardHeight, borderColor: `${laneColors[lane]}33` }}
        >
          <div className="absolute inset-0">
            {notes
              .filter((note) => note.lane === lane && note.status === 'pending')
              .map((note) => {
                const timeToHit = note.time - (currentTime + offsetSeconds);
                if (timeToHit < -0.4) {
                  return null;
                }
                const top = Math.min(
                  boardHeight,
                  Math.max(0, judgementLine - timeToHit * pixelsPerSecond)
                );
                return (
                  <div
                    key={note.id}
                    className="absolute left-1/2 h-4 w-14 -translate-x-1/2 rounded-full shadow shadow-slate-900"
                    style={{
                      top,
                      backgroundColor: laneColors[lane],
                      boxShadow: `0 0 12px ${laneColors[lane]}55`
                    }}
                  />
                );
              })}
          </div>
          <div
            className={`absolute bottom-16 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-white/80 shadow shadow-slate-900 transition ${
              pressedLanes[lane] ? 'scale-105 bg-white' : ''
            }`}
          />
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center text-xs text-slate-200">
            <span className="text-lg font-semibold">{keyLabels[lane]}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Lane {lane + 1}</span>
          </div>
        </div>
      ))}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{ top: judgementLine }}
      >
        <div className="mx-3 h-0.5 bg-white/30" />
      </div>
    </div>
  );
};

export default GameBoard;
