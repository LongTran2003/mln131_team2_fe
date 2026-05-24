interface Props {
  totalSlots: number;
  answeredPositions: number[];
  lockedPositions: number[];
  onPick: (position: number) => void;
  disabled?: boolean;
}

export function SlotPickerGrid({
  totalSlots, answeredPositions, lockedPositions, onPick, disabled,
}: Props) {
  const answered = new Set(answeredPositions);
  const locked = new Set(lockedPositions);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Chọn 1 slot — xanh = còn, xám = đã đáp, đỏ = khóa
      </p>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: totalSlots }, (_, i) => i + 1).map(n => {
          const isAnswered = answered.has(n);
          const isLocked = locked.has(n);
          const available = !isAnswered && !isLocked;
          const cls = isLocked
            ? 'bg-red-100 text-red-400 line-through cursor-not-allowed'
            : isAnswered
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : disabled
                ? 'bg-blue-50 text-blue-300 cursor-not-allowed'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-500 hover:text-white hover:scale-110 cursor-pointer';
          return (
            <button key={n}
              onClick={() => available && !disabled && onPick(n)}
              disabled={!available || disabled}
              className={`h-7 w-full rounded font-bold text-xs transition ${cls}`}>
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}