import type { QuestionDto } from '../types';

interface Props {
  question: QuestionDto;
  remaining: number;
  onAnswer?: (index: number) => void;
  disabled?: boolean;
  mode: 'drawer' | 'steal' | 'readonly';
}

const LABELS = ['A', 'B', 'C', 'D'];

export function QuestionPanel({ question, remaining, onAnswer, disabled, mode }: Props) {
  const isSteal = mode === 'steal';
  const canClick = (mode === 'drawer' || mode === 'steal') && !disabled;
  return (
    <div className={`rounded-xl shadow-lg p-6 ${
      isSteal ? 'bg-orange-50 border-2 border-orange-400' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isSteal && (
            <span className="text-orange-600 font-bold text-sm animate-pulse">
              ⚡ STEAL — Click nhanh nhất!
            </span>
          )}
          {question.type === 'Redemption' && (
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-semibold">
              Cứu trợ
            </span>
          )}
          {mode === 'readonly' && <span className="text-gray-500 text-sm italic">Chỉ xem</span>}
        </div>
        <span className={`px-3 py-1 rounded-full font-bold ${
          remaining <= 3 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'
        }`}>⏱ {remaining}s</span>
      </div>

      <p className="text-lg font-semibold mb-4 leading-relaxed">{question.text}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, i) => (
          <button key={i}
            onClick={() => canClick && onAnswer?.(i)}
            disabled={!canClick}
            className={`text-left p-3 rounded-lg border-2 transition ${
              canClick
                ? 'border-gray-200 hover:border-red-400 hover:bg-red-50 cursor-pointer'
                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-70'
            }`}>
            <span className="font-bold text-red-500 mr-2">{LABELS[i]}.</span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}