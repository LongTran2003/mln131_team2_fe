interface Props {
  winnerName: string;
  onClose: () => void;
}

export function GameEndedModal({ winnerName, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-yellow-400">
        <div className="flex justify-center gap-1 mb-3">
          {['🎉', '🏆', '🎉'].map((e, i) => (
            <span key={i} className="text-4xl animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }}>{e}</span>
          ))}
        </div>
        <h2 className="text-2xl font-extrabold text-yellow-600 uppercase tracking-wide mb-1">
          Chiến thắng!
        </h2>
        <p className="text-gray-400 text-xs mb-3">Người kêu KINH thành công</p>
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl py-4 px-6 mb-6 shadow-lg">
          <p className="text-3xl font-bold text-white">{winnerName}</p>
          <p className="text-sm text-white/70 mt-1">🎯 KINH!</p>
        </div>
        <button onClick={onClose}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-lg transition">
          Về trang chủ
        </button>
      </div>
    </div>
  );
}