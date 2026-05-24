import type { CardDto } from '../types';
import { getCardTheme } from '../utils/cardTheme';

interface Props {
  card: CardDto;
  marked: Set<number>;
  called: Set<number>;
}

export function GameCard({ card, marked, called }: Props) {
  const theme = getCardTheme(card.id);
  return (
    <div className={`${theme.bg} ${theme.border} border-2 rounded-xl p-4`}>
      <div className={`${theme.accent} rounded-lg mb-3 flex items-center gap-2 px-3 py-2`}>
        <span className="text-4xl">{theme.emoji}</span>
        <span className="font-mono text-sm font-bold text-gray-700">{theme.label}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {card.grid.flat().map((n, i) => {
          if (n === 0) {
            return (
              <div key={i}
                className="aspect-square rounded-lg bg-gray-100 border border-dashed border-gray-300" />
            );
          }
          const isMarked = marked.has(n);
          const isCalled = called.has(n);
          const cls = isMarked
            ? 'bg-green-500 text-white shadow-md scale-105'
            : isCalled
              ? 'bg-gray-200 text-gray-400 line-through'
              : 'bg-white text-gray-800';
          return (
            <div key={i}
              className={`aspect-square flex items-center justify-center rounded-lg font-bold text-lg transition select-none ${cls}`}>
              {n}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500 text-center">
        🟢 Đã thắng · ─ Số đã qua · ⬜ Chưa gọi
      </p>
    </div>
  );
}
