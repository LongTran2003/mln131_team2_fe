import type { CardDto } from '../types';
import { getCardTheme } from '../utils/cardTheme';

interface Props {
  card: CardDto;
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardPreview({ card, onClick, selected, size = 'md' }: Props) {
  const theme = getCardTheme(card.id);

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };
  const numSize = {
    sm: 'text-[11px]',
    md: 'text-sm',
    lg: 'text-base',
  };
  const emojiSize = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const ringClass = selected
    ? 'ring-4 ring-red-400 scale-105'
    : onClick
    ? 'hover:scale-105 hover:shadow-lg'
    : '';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${theme.bg} ${theme.border} border-2 rounded-xl ${sizeClasses[size]} ${ringClass} transition-all ${onClick ? 'cursor-pointer' : 'cursor-default'} text-left w-full`}
    >
      {/* Header: emoji + label */}
      <div className={`${theme.accent} rounded-lg mb-2 flex items-center gap-2 px-2 py-1`}>
        <span className={emojiSize[size]}>{theme.emoji}</span>
        <span className="font-mono text-xs font-bold text-gray-700">{theme.label}</span>
      </div>

      {/* 4x4 grid với ô đục lỗ (n=0 = lỗ) */}
      <div className="grid grid-cols-4 gap-0.5">
        {card.grid.flat().map((n, i) =>
          n === 0 ? (
            <div
              key={i}
              className="aspect-square bg-gray-100 border border-dashed border-gray-300 rounded"
            />
          ) : (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center bg-white rounded ${numSize[size]} font-mono font-medium text-gray-800 shadow-sm`}
            >
              {n}
            </div>
          )
        )}
      </div>
    </button>
  );
}