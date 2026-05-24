import type { CardDto } from '../types';

export function detectWin(
  grid: number[][], marked: Set<number>
): { type: 'Row' | 'Column'; index: number } | null {
  const size = 4;
  for (let r = 0; r < size; r++) {
    const nums = grid[r].filter(n => n !== 0);
    if (nums.length > 0 && nums.every(n => marked.has(n)))
      return { type: 'Row', index: r };
  }
  for (let c = 0; c < size; c++) {
    const nums = grid.map(row => row[c]).filter(n => n !== 0);
    if (nums.length > 0 && nums.every(n => marked.has(n)))
      return { type: 'Column', index: c };
  }
  return null;
}

interface Props {
  card: CardDto;
  marked: Set<number>;
  onClaim: () => void;
  disabled?: boolean;
  className?: string;
}

export function KinhButton({ card, marked, onClaim, disabled, className = '' }: Props) {
  const win = detectWin(card.grid, marked);
  if (!win) {
    return (
      <button disabled
        className={`w-full py-3 bg-gray-100 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed ${className}`}>
        KINH! <span className="text-xs block">(cần 3-in-hàng/cột)</span>
      </button>
    );
  }
  return (
    <button onClick={onClaim} disabled={disabled}
      className={`w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold text-xl shadow-lg hover:scale-105 transition disabled:opacity-50 animate-pulse ${className}`}>
      🎉 KINH! <span className="text-sm block">{win.type === 'Row' ? `Hàng ${win.index + 1}` : `Cột ${win.index + 1}`}</span>
    </button>
  );
}
