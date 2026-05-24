import type { CardDto } from '../types';
import { getCardTheme } from '../utils/cardTheme';

interface Props {
  card: CardDto;
  marked: Set<number>;
  called: Set<number>;
  onMark: (n: number) => void;
}

export function GameCard({ card, marked, called, onMark }: Props) {
  const theme = getCardTheme(card.id);
  return (
    <div className={`${theme.bg} ${theme.border} border-2 rounded-xl p-4`}>
      <div className={`${theme.accent} rounded-lg mb-3 flex items-center gap-2 px-3 py-2`}>
        <span className="text-4xl">{theme.emoji}</span>
        <span className="font-mono text-sm font-bold text-gray-700">{theme.label}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {card.grid.flat().map((n, i) => {
          const isCalled = called.has(n);
          const isMarked = marked.has(n);
          const cls = isMarked
            ? 'bg-red-500 text-white shadow-md scale-105'
            : isCalled
              ? 'bg-yellow-200 text-gray-800 ring-2 ring-yellow-400 animate-pulse'
              : 'bg-white text-gray-800';
          return (
            <button key={i}
              onClick={() => isCalled && !isMarked && onMark(n)}
              disabled={!isCalled || isMarked}
              className={`aspect-square flex items-center justify-center rounded-lg font-bold text-lg transition ${cls} ${isCalled && !isMarked ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
              {n}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500 text-center">
        🟡 Số đã gọi (click để mark) · 🔴 Đã mark
      </p>
    </div>
  );
}