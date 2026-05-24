import { useEffect, useRef, useState } from 'react';
import { PLAYLIST } from '../config/playlist';

export function RadioWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = PLAYLIST[currentIndex];

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setHasError(false);
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        setHasError(true);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex(i => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
  };
  const handleNext = () => {
    setCurrentIndex(i => (i + 1) % PLAYLIST.length);
  };

  const volumeIcon = volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.75 ? '🔉' : '🔊';

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white rounded-2xl shadow-2xl border-2 border-red-300 overflow-hidden">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onEnded={handleNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => { setHasError(true); setIsPlaying(false); }}
      />

      <div className="bg-gradient-to-r from-red-500 to-yellow-500 text-white px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={isPlaying ? 'inline-block animate-spin' : 'inline-block'}>💿</span>
          <span className="text-sm font-bold whitespace-nowrap">Đài phát</span>
        </div>
        <button
          onClick={() => setIsExpanded(e => !e)}
          className="text-white hover:bg-white/20 rounded px-2 leading-none text-lg font-bold"
          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {isExpanded ? '–' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 w-72 space-y-3">
          <div className="text-center">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Bài {currentIndex + 1} / {PLAYLIST.length}
            </div>
            <div className="text-sm font-bold text-gray-800 truncate">
              {currentTrack.title}
            </div>
            {hasError && (
              <div className="text-[10px] text-red-500 mt-1">
                ⚠ Không tải được file. Đặt MP3 vào public/music/
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePrev}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full text-lg flex items-center justify-center"
              title="Bài trước"
            >
              ⏮
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-2xl shadow flex items-center justify-center"
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full text-lg flex items-center justify-center"
              title="Bài tiếp"
            >
              ⏭
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVolume(v => v > 0 ? 0 : 0.4)}
              className="text-xl"
              title={volume === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
            >
              {volumeIcon}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-red-500"
            />
            <span className="text-xs text-gray-500 w-9 text-right font-mono">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}