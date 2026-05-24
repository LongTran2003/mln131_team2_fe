import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsApi } from '../api/rooms';
import { useSignalR } from '../hooks/useSignalR';
import { useCountdown } from '../hooks/useCountdown';
import { storage } from '../utils/storage';
import type { GameStateDto, CardDto, PlayerDto, QuestionDto } from '../types';
import { GameCard } from '../components/GameCard';
import { CalledNumbersBar } from '../components/CalledNumbersBar';
import { QuestionPanel } from '../components/QuestionPanel';
import { KinhButton } from '../components/KinhButton';
import { GameEndedModal } from '../components/GameEndedModal';

interface ActiveQuestion {
  question: QuestionDto;
  spunNumber: number;
  drawerId: string;
  deadline: string;
  isStealMode: boolean;
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  const isNetwork = message.includes('kết nối') || message.includes('thử lại');
  useEffect(() => {
    if (!isNetwork) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, isNetwork, onClose]);
  return (
    <div className={`p-3 rounded text-sm flex justify-between items-center ${
      isNetwork ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-red-50 border border-red-200 text-red-800'
    }`}>
      <span>{isNetwork ? '⚠️' : '✗'} {message}</span>
      <button onClick={onClose} className="ml-3 font-bold opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [session] = useState(() => storage.load());

  useEffect(() => {
    if (!session || !code || session.roomCode !== code) {
      navigate('/', { replace: true });
    }
  }, [session, code, navigate]);

  const [gameState, setGameState] = useState<GameStateDto | null>(null);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [myCard, setMyCard] = useState<CardDto | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
  const [latestCalled, setLatestCalled] = useState<number | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelDisplay, setWheelDisplay] = useState<number | null>(null);
  const [myTurnPopup, setMyTurnPopup] = useState(false);
  const [wrongAnswerPopup, setWrongAnswerPopup] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const playersRef = useRef<PlayerDto[]>([]);
  useEffect(() => { playersRef.current = players; }, [players]);

  const remaining = useCountdown(
    activeQuestion?.deadline ?? gameState?.deadline ?? null
  );

  // Derive markedNumbers from players list (auto-mark is server-side)
  const markedNumbers = useMemo(
    () => new Set(players.find(p => p.id === session?.playerId)?.markedNumbers ?? []),
    [players, session?.playerId]
  );

  // Wheel cycling effect: trong khi spinning, hiển thị số ngẫu nhiên 80ms/lần
  useEffect(() => {
    if (!isSpinning) { setWheelDisplay(null); return; }
    const id = setInterval(() => {
      setWheelDisplay(Math.floor(Math.random() * 40) + 1);
    }, 80);
    return () => clearInterval(id);
  }, [isSpinning]);

  useEffect(() => {
    if (session?.cardId && session?.cardGrid && !myCard) {
      setMyCard({
        id: session.cardId, grid: session.cardGrid,
        ownerId: session.playerId, isAvailable: false,
      });
    }
  }, [session?.cardId, session?.cardGrid, session?.playerId, myCard]);

  const refetchingRef = useRef(false);
  const refetchState = useCallback(async () => {
    if (!code || refetchingRef.current) return;
    refetchingRef.current = true;
    try {
      const state = await roomsApi.getGameState(code);
      setGameState(state);
      setCalledNumbers(new Set(state.calledNumbers));
    } catch { }
    finally { refetchingRef.current = false; }
  }, [code]);

  const refetchPlayers = useCallback(async () => {
    if (!code) return;
    try { setPlayers(await roomsApi.getPlayers(code)); } catch { }
  }, [code]);

  const loadInitial = useCallback(async () => {
    if (!code || !session) return;
    try {
      const [state, playersList] = await Promise.all([
        roomsApi.getGameState(code),
        roomsApi.getPlayers(code),
      ]);
      setGameState(state);
      setCalledNumbers(new Set(state.calledNumbers));
      setPlayers(playersList);

      if (session.isHost) {
        try { setAllCards(await roomsApi.getAllCards(code)); } catch { }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('kết nối') ? msg : 'Không thể tải dữ liệu — vui lòng tải lại trang');
    }
  }, [code, session]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) refetchState(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refetchState]);

  useEffect(() => {
    if (!code) return;
    const id = setInterval(refetchState, 10_000);
    return () => clearInterval(id);
  }, [code, refetchState]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handlers = useMemo(() => ({
    WheelSpun: (data: {
      spunNumber: number; question: QuestionDto;
      firstAnswererId: string; deadline: string;
    }) => {
      setActiveQuestion({
        question: data.question,
        spunNumber: data.spunNumber,
        drawerId: data.firstAnswererId,
        deadline: data.deadline,
        isStealMode: false,
      });
      setHasAnswered(false);
      setGameState(prev => prev && ({
        ...prev, phase: 'DrawerAnswering',
        currentDrawerId: data.firstAnswererId,
        deadline: data.deadline,
        currentSpunNumber: data.spunNumber,
      }));
      if (session && data.firstAnswererId === session.playerId) {
        setMyTurnPopup(true);
        setTimeout(() => setMyTurnPopup(false), 2000);
      }
      const name = playersRef.current.find(p => p.id === data.firstAnswererId)?.name ?? '...';
      showToast(`🎰 Số ${data.spunNumber} — ${name} trả lời!`);
    },

    ReadyToSpin: () => {
      setActiveQuestion(null);
      setHasAnswered(false);
      setGameState(prev => prev && ({
        ...prev, phase: 'Idle',
        currentDrawerId: null, currentSlotId: null,
        deadline: null, currentSpunNumber: null,
      }));
    },

    AnswerSubmitted: (data: { playerId: string; isCorrect: boolean }) => {
      if (session && data.playerId === session.playerId && !data.isCorrect) {
        setWrongAnswerPopup(true);
        setTimeout(() => setWrongAnswerPopup(false), 2000);
      } else {
        const name = playersRef.current.find(p => p.id === data.playerId)?.name ?? '?';
        showToast(`${name} trả lời ${data.isCorrect ? '✅ đúng' : '❌ sai'}`);
      }
    },

    NumberCalled: (data: { number: number; byPlayer: string }) => {
      setCalledNumbers(prev => new Set(prev).add(data.number));
      setLatestCalled(data.number);
      setTimeout(() => setLatestCalled(null), 3000);
      // Optimistic update + server sync
      setPlayers(prev => prev.map(p =>
        p.id === data.byPlayer
          ? { ...p, markedNumbers: [...(p.markedNumbers ?? []), data.number] }
          : p
      ));
      refetchPlayers();
      refetchState();
    },

    StealModeStarted: ({ deadline }: { deadline: string }) => {
      setActiveQuestion(prev => prev ? { ...prev, isStealMode: true, deadline } : prev);
      setHasAnswered(false);
      setGameState(prev => prev && ({ ...prev, phase: 'Stealing', deadline }));
      showToast('⚡ Giành quyền trả lời!');
    },

    StealResolved: (data: { winnerId: string | null; calledNumber: number | null; slotLocked: boolean }) => {
      setActiveQuestion(null);
      if (data.winnerId) {
        const name = playersRef.current.find(p => p.id === data.winnerId)?.name ?? '?';
        showToast(`🏆 ${name} đã giành được!`);
      } else if (data.slotLocked) {
        showToast('Hết giờ — slot bị khóa');
      }
      refetchPlayers();
      refetchState();
    },

    KinhClaimed: (data: { playerId: string; verified: boolean; reason: string | null }) => {
      const name = playersRef.current.find(p => p.id === data.playerId)?.name ?? '?';
      showToast(data.verified
        ? `🎉 ${name} kêu KINH thành công!`
        : `❌ ${name} kêu sai${data.reason ? `: ${data.reason}` : ''}`
      );
    },

    GameEnded: (data: { winnerId: string }) => {
      const name = playersRef.current.find(p => p.id === data.winnerId)?.name ?? 'Người chơi';
      setWinnerInfo({ name });
    },
  }), [session, showToast, refetchPlayers, refetchState]);

  useSignalR({
    roomCode: code ?? null,
    clientId: session?.playerId ?? null,
    handlers,
    onReconnected: refetchState,
    enabled: !!session && !!code,
  });

  // ===== Actions =====
  const handleSpinWheel = async () => {
    if (!session || !code || isSpinning) return;
    setIsSpinning(true);
    try {
      // Min 1.5s để vòng quay có cảm giác thật (như sổ số kiến thiết)
      await Promise.all([
        roomsApi.spinWheel(code, session.playerId),
        new Promise(r => setTimeout(r, 1500)),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể quay số, thử lại');
    } finally {
      setIsSpinning(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!session || !code || !activeQuestion || hasAnswered) return;
    setHasAnswered(true);
    try {
      if (activeQuestion.isStealMode) {
        await roomsApi.stealAttempt(code, session.playerId, answerIndex);
      } else {
        await roomsApi.submitAnswer(code, session.playerId, answerIndex);
      }
    } catch (e) {
      setHasAnswered(false);
      setError(e instanceof Error ? e.message : 'Không thể gửi câu trả lời, thử lại');
    }
  };

  const handleClaimKinh = async () => {
    if (!session || !code) return;
    try {
      const res = await roomsApi.claimKinh(code, session.playerId);
      if (res && !res.isValid) setError(res.reason ?? 'Kinh không hợp lệ');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể kêu KINH, thử lại');
    }
  };

  if (!session || !code) return null;

  const isHost = session.isHost;
  const phase = gameState?.phase ?? 'Idle';
  const isMyTurn = gameState?.currentDrawerId === session.playerId;
  const currentDrawer = players.find(p => p.id === gameState?.currentDrawerId);
  const cardById = new Map(allCards.map(c => [c.id, c]));
  const spunNumber = gameState?.currentSpunNumber;
  const gamers = players.filter(p => !p.isHost);
  const sortedGamers = [...gamers].sort(
    (a, b) => (b.markedNumbers?.length ?? 0) - (a.markedNumbers?.length ?? 0)
  );
  const maxMarks = Math.max(0, ...gamers.map(p => p.markedNumbers?.length ?? 0));
  const leaderIds = new Set(
    maxMarks > 0
      ? gamers.filter(p => (p.markedNumbers?.length ?? 0) === maxMarks).map(p => p.id)
      : []
  );

  const phaseLabel = ({
    Idle: '🎯 Sẵn sàng quay số',
    DrawerAnswering: `${currentDrawer?.name ?? '...'} đang trả lời`,
    Stealing: '⚡ GIÀNH QUYỀN TRẢ LỜI',
    Revealing: '✅ Đang xét kết quả...',
  } as const)[phase] ?? phase;

  let qMode: 'drawer' | 'steal' | 'readonly' = 'readonly';
  if (activeQuestion && !isHost) {
    if (!activeQuestion.isStealMode && isMyTurn) qMode = 'drawer';
    else if (activeQuestion.isStealMode && gameState?.currentDrawerId !== session.playerId) qMode = 'steal';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-yellow-50 p-3 relative overflow-hidden">
      {/* Watermark */}
      <div className="fixed inset-0 pointer-events-none select-none flex flex-col items-center justify-center -z-0 opacity-[0.04]">
        <div className="text-[22vw] font-black text-red-700 leading-none tracking-tighter">40</div>
        <div className="text-[3.5vw] font-extrabold text-red-700 uppercase tracking-[0.3em] -mt-4">Năm Đổi Mới</div>
        <div className="text-[2vw] font-bold text-yellow-600 tracking-widest mt-1">1986 – 2026</div>
      </div>

      {/* "Đến lượt bạn" full-screen popup */}
      {myTurnPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20">
          <div className="bg-red-500 text-white text-4xl font-black px-10 py-6 rounded-2xl shadow-2xl animate-bounce">
            🎯 Đến lượt bạn!
          </div>
        </div>
      )}

      {/* "Bạn đã trả lời sai" full-screen popup */}
      {wrongAnswerPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/30">
          <div className="bg-gray-800 text-white text-4xl font-black px-10 py-6 rounded-2xl shadow-2xl animate-bounce border-4 border-red-500">
            ❌ Bạn đã trả lời sai!
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white rounded-xl shadow p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xs text-gray-500">Phòng</span>
                <span className="ml-1 font-mono font-bold">{code}</span>
              </div>
              <div className="border-l pl-3">
                <span className="text-xs text-gray-500">Bạn:</span>
                <span className="ml-1 font-bold text-red-600">{session.playerName}</span>
                {isHost && <span className="ml-1 text-xs bg-yellow-100 px-2 py-0.5 rounded">Quản trò</span>}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-center text-sm ${
              phase === 'Stealing' ? 'bg-orange-500 text-white animate-pulse' :
              isMyTurn ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}>{phaseLabel}</div>
            <div className="text-xs text-gray-500">
              <strong>{gameState?.answeredPositions.length ?? 0}</strong> đáp ·&nbsp;
              <strong>{gameState?.lockedPositions.length ?? 0}</strong> khóa /&nbsp;
              <strong>{gameState?.remainingSlots ?? 40}</strong> còn
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
            <span className="text-xs text-gray-500">Bảng xếp hạng:</span>
            {sortedGamers.map(p => {
              const isDrawer = p.id === gameState?.currentDrawerId;
              const isMe = p.id === session.playerId;
              const isLeader = leaderIds.has(p.id);
              const marks = p.markedNumbers?.length ?? 0;
              return (
                <span key={p.id} className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
                  isDrawer ? 'bg-red-500 text-white ring-2 ring-red-300 animate-pulse' :
                  isMe ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.online ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span>{p.name}</span>
                  {isDrawer && <span>🎯</span>}
                  {isLeader && <span title="Dẫn đầu">👑</span>}
                  {isMe && <span className="opacity-70">(bạn)</span>}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isDrawer ? 'bg-red-700' : isMe ? 'bg-yellow-300 text-yellow-900' : 'bg-white text-gray-700'
                  }`}>{marks}/12</span>
                </span>
              );
            })}
          </div>
        </div>

        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
        {toast && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 text-center font-medium">
            {toast}
          </div>
        )}

        {/* HOST VIEW */}
        {isHost && (
          <div className="flex gap-3 items-start">
            {/* Left: player progress sorted by marks */}
            <div className="w-44 shrink-0 bg-white rounded-xl shadow p-3 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tiến độ</h3>
              {sortedGamers.map((p, idx) => {
                const marks = p.markedNumbers?.length ?? 0;
                const isDrawer = p.id === gameState?.currentDrawerId;
                const isLeader = leaderIds.has(p.id);
                return (
                  <div key={p.id} className={`p-2 rounded-lg transition ${
                    isDrawer
                      ? 'bg-red-100 border-2 border-red-500 shadow-lg shadow-red-200 animate-pulse'
                      : isLeader
                        ? 'bg-yellow-50 border-2 border-yellow-400'
                        : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center mb-1 gap-1">
                      <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                      <span className="text-xs font-semibold truncate flex-1">{p.name}</span>
                      {isLeader && <span title="Dẫn đầu">👑</span>}
                      {isDrawer && <span>🎯</span>}
                      <span className="text-xs text-gray-500 font-mono">{marks}/12</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${
                        isLeader ? 'bg-yellow-500' : 'bg-red-500'
                      }`} style={{ width: `${Math.min((marks / 12) * 100, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center/right: spin wheel + question + mini cards */}
            <div className="flex-1 space-y-3">
              {/* Spinning wheel — luôn hiển thị */}
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                  {phase === 'Idle' ? '🎰 Vòng quay số' : 'Số vừa quay'}
                </div>

                <div className="relative w-56 h-56 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full shadow-2xl ${isSpinning ? 'animate-spin' : ''}`}
                    style={{
                      background: 'conic-gradient(from 0deg, #ef4444, #fbbf24, #ef4444, #fbbf24, #ef4444, #fbbf24, #ef4444, #fbbf24, #ef4444)',
                      animationDuration: isSpinning ? '0.5s' : undefined,
                    }}
                  />
                  <div className="absolute inset-4 rounded-full bg-white shadow-inner flex items-center justify-center">
                    <div className={`text-7xl font-black ${
                      isSpinning ? 'text-red-500 animate-pulse' : spunNumber ? 'text-red-600' : 'text-gray-300'
                    }`}>
                      {isSpinning ? (wheelDisplay ?? '?') : (spunNumber ?? '?')}
                    </div>
                  </div>
                  {/* Pointer mũi tên ở trên */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent border-t-red-700 drop-shadow-lg z-10" />
                </div>

                {phase === 'Idle' && (
                  <button
                    onClick={handleSpinWheel}
                    disabled={isSpinning}
                    className="px-10 py-4 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-xl font-black text-2xl shadow-lg hover:scale-105 transition disabled:opacity-50 disabled:scale-100"
                  >
                    {isSpinning ? '⏳ Đang quay...' : '🎰 QUAY SỐ'}
                  </button>
                )}

                {phase !== 'Idle' && (
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-700">
                      {phase === 'DrawerAnswering' && `${currentDrawer?.name ?? '...'} đang trả lời`}
                      {phase === 'Stealing' && '⚡ Giành quyền trả lời!'}
                      {phase === 'Revealing' && '✅ Đang xét kết quả...'}
                    </div>
                    {remaining > 0 && (phase === 'DrawerAnswering' || phase === 'Stealing') && (
                      <div className={`text-3xl font-black ${remaining <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                        {remaining}s
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  {gameState?.remainingSlots ?? 40} số còn trong vòng quay
                </p>
              </div>

              {activeQuestion && (
                <QuestionPanel
                  question={activeQuestion.question}
                  remaining={remaining}
                  onAnswer={() => {}}
                  disabled={true}
                  mode="readonly"
                />
              )}

              {/* Mini cards */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-sm mb-3">📺 {gamers.length} người chơi</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {gamers.map(p => {
                    const card = p.cardId ? cardById.get(p.cardId) : null;
                    const marks = new Set(p.markedNumbers ?? []);
                    return (
                      <div key={p.id} className={`border-2 rounded-lg p-2 ${
                        p.id === gameState?.currentDrawerId ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-xs font-semibold truncate flex-1">{p.name}</span>
                          <span className="text-xs text-gray-500">{marks.size}/12</span>
                        </div>
                        {card ? (
                          <div className="grid grid-cols-4 gap-px">
                            {card.grid.flat().map((n, i) =>
                              n === 0 ? (
                                <div key={i} className="aspect-square bg-gray-100 rounded" />
                              ) : (
                                <div key={i} className={`aspect-square flex items-center justify-center text-[9px] rounded ${
                                  marks.has(n) ? 'bg-green-500 text-white font-bold' :
                                  calledNumbers.has(n) ? 'bg-gray-200 text-gray-400' :
                                  'bg-white text-gray-600'
                                }`}>{n}</div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic text-center py-3">Không có card</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PLAYER VIEW */}
        {!isHost && (
          <div className="flex gap-3 items-start">
            {/* Left: called numbers */}
            <div className="w-36 shrink-0">
              <CalledNumbersBar
                called={Array.from(calledNumbers).sort((a, b) => a - b)}
                latest={latestCalled}
                sidebar
              />
            </div>

            {/* Right: question + card + KINH */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Spun number for player */}
              {spunNumber && phase !== 'Idle' && (
                <div className="bg-white rounded-xl shadow px-4 py-3 flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 text-white rounded-lg flex items-center justify-center font-black text-2xl">
                    {spunNumber}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Số vừa quay</div>
                    <div className="text-sm font-bold text-gray-700">
                      {phase === 'DrawerAnswering' && !isMyTurn && `Đợi ${currentDrawer?.name ?? '...'} trả lời`}
                      {phase === 'DrawerAnswering' && isMyTurn && '🎯 Đến lượt bạn!'}
                      {phase === 'Stealing' && '⚡ Giành quyền!'}
                      {phase === 'Revealing' && '✅ Đang xét...'}
                    </div>
                  </div>
                  {remaining > 0 && (phase === 'DrawerAnswering' || phase === 'Stealing') && (
                    <div className={`ml-auto text-2xl font-black ${remaining <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                      {remaining}s
                    </div>
                  )}
                </div>
              )}

              {phase === 'Idle' && (
                <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
                  <div className="text-3xl mb-2">⏳</div>
                  <p className="font-medium">Đợi quản trò quay số...</p>
                </div>
              )}

              {activeQuestion && (
                <QuestionPanel
                  question={activeQuestion.question}
                  remaining={remaining}
                  onAnswer={handleAnswer}
                  disabled={hasAnswered || qMode === 'readonly'}
                  mode={qMode}
                />
              )}

              {myCard && (
                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="max-w-xs mx-auto sm:max-w-sm">
                      <GameCard
                        card={myCard}
                        marked={markedNumbers}
                        called={calledNumbers}
                      />
                    </div>
                  </div>
                  <div className="w-28 shrink-0 pt-1">
                    <KinhButton
                      card={myCard}
                      marked={markedNumbers}
                      onClaim={handleClaimKinh}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {winnerInfo && (
        <GameEndedModal
          winnerName={winnerInfo.name}
          onClose={() => {
            setWinnerInfo(null);
            storage.clear();
            navigate('/', { replace: true });
          }}
        />
      )}
    </div>
  );
}
