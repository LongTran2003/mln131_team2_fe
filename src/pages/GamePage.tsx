import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsApi } from '../api/rooms';
import { useSignalR } from '../hooks/useSignalR';
import { useCountdown } from '../hooks/useCountdown';
import { storage } from '../utils/storage';
import type { GameStateDto, CardDto, PlayerDto, QuestionDto } from '../types';
import { GameCard } from '../components/GameCard';
import { CalledNumbersBar } from '../components/CalledNumbersBar';
import { SlotPickerGrid } from '../components/SlotPickerGrid';
import { QuestionPanel } from '../components/QuestionPanel';
import { KinhButton } from '../components/KinhButton';
import { GameEndedModal } from '../components/GameEndedModal';

interface ActiveQuestion {
  question: QuestionDto;
  assignedNumber: number;
  drawerId: string;
  deadline: string;
  isStealMode: boolean;
}

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const session = storage.load();

  useEffect(() => {
    if (!session || !code || session.roomCode !== code) {
      navigate('/', { replace: true });
    }
  }, [session, code, navigate]);

  // ===== State =====
  const [gameState, setGameState] = useState<GameStateDto | null>(null);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [allCards, setAllCards] = useState<CardDto[]>([]);
  const [myCard, setMyCard] = useState<CardDto | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(new Set());
  const [latestCalled, setLatestCalled] = useState<number | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [picking, setPicking] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Refs cho handlers (tránh stale closure khi players list update)
  const playersRef = useRef<PlayerDto[]>([]);
  useEffect(() => { playersRef.current = players; }, [players]);

  const remaining = useCountdown(
    activeQuestion?.deadline ?? gameState?.deadline ?? null
  );

  // Restore myCard từ session
  useEffect(() => {
    if (session?.cardId && session?.cardGrid && !myCard) {
      setMyCard({
        id: session.cardId, grid: session.cardGrid,
        ownerId: session.playerId, isAvailable: false,
      });
    }
  }, [session?.cardId, session?.cardGrid, session?.playerId, myCard]);

  // ===== Load =====
  const refetchState = useCallback(async () => {
    if (!code) return;
    try {
      const state = await roomsApi.getGameState(code);
      setGameState(state);
      setCalledNumbers(new Set(state.calledNumbers));
    } catch { /* silent */ }
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

      const me = playersList.find(p => p.id === session.playerId);
      if (me?.markedNumbers) setMarkedNumbers(new Set(me.markedNumbers));

      if (session.isHost) {
        try {
          const cards = await roomsApi.getAllCards(code);
          setAllCards(cards);
        } catch { /* getAllCards optional */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load thất bại');
    }
  }, [code, session]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Sync state khi tab quay lại visible
  useEffect(() => {
    const handler = () => { if (!document.hidden) refetchState(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refetchState]);

  // Heartbeat: refetch state mỗi 10s phòng SignalR event miss
  useEffect(() => {
    if (!code) return;
    const id = setInterval(refetchState, 10_000);
    return () => clearInterval(id);
  }, [code, refetchState]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ===== SignalR handlers =====
  const handlers = useMemo(() => ({
    TurnStarted: ({ drawerId, deadline }: { drawerId: string; deadline: string }) => {
      setActiveQuestion(null);
      setHasAnswered(false);
      setPicking(false);
      setGameState(prev => prev && ({
        ...prev, phase: 'DrawerSelecting', currentDrawerId: drawerId, deadline,
      }));
      const name = playersRef.current.find(p => p.id === drawerId)?.name ?? '...';
      showToast(`Lượt: ${name}`);
    },

    QuestionShown: (data: {
      drawerId: string; question: QuestionDto;
      assignedNumber: number; deadline: string;
    }) => {
      setActiveQuestion({
        question: data.question,
        assignedNumber: data.assignedNumber,
        drawerId: data.drawerId,
        deadline: data.deadline,
        isStealMode: false,
      });
      setHasAnswered(false);
      setPicking(false);
      setGameState(prev => prev && ({
        ...prev, phase: 'DrawerAnswering', deadline: data.deadline,
      }));
    },

    AnswerSubmitted: (data: { playerId: string; isCorrect: boolean }) => {
      const name = playersRef.current.find(p => p.id === data.playerId)?.name ?? '?';
      showToast(`${name} trả lời ${data.isCorrect ? '✅ đúng' : '❌ sai'}`);
    },

    NumberCalled: (data: { number: number; byPlayer: string }) => {
      setCalledNumbers(prev => new Set(prev).add(data.number));
      setLatestCalled(data.number);
      setTimeout(() => setLatestCalled(null), 3000);
      refetchState();
    },

    StealModeStarted: ({ deadline }: { deadline: string }) => {
      setActiveQuestion(prev => prev ? { ...prev, isStealMode: true, deadline } : prev);
      setHasAnswered(false);
      setGameState(prev => prev && ({ ...prev, phase: 'Stealing', deadline }));
      showToast('⚡ Giành quyền trả lời!');
    },

    StealResolved: (data: {
      winnerId: string | null; calledNumber: number | null; slotLocked: boolean;
    }) => {
      setActiveQuestion(null);
      if (data.winnerId) {
        const name = playersRef.current.find(p => p.id === data.winnerId)?.name ?? '?';
        showToast(`${name} đã giành được!`);
      } else if (data.slotLocked) {
        showToast('Hết giờ — slot bị khóa');
      }
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
  }), [refetchState]);

  useSignalR({
    roomCode: code ?? null,
    clientId: session?.playerId ?? null,
    handlers,
    onReconnected: refetchState,
    enabled: !!session && !!code,
  });

  // ===== Actions =====
  const handleMark = async (number: number) => {
    if (!session || !code) return;
    setMarkedNumbers(prev => new Set(prev).add(number));
    try {
      await roomsApi.markNumber(code, session.playerId, number);
    } catch (e) {
      setMarkedNumbers(prev => {
        const s = new Set(prev); s.delete(number); return s;
      });
      setError(e instanceof Error ? e.message : 'Mark thất bại');
    }
  };

  const handlePickSlot = async (position: number) => {
    if (!session || !code || picking) return;
    setPicking(true);
    try {
      await roomsApi.pickSlot(code, session.playerId, position);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pick slot thất bại');
      refetchState();
    } finally {
      setPicking(false);
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
      setError(e instanceof Error ? e.message : 'Trả lời thất bại');
      refetchState();
    }
  };

  const handleClaimKinh = async () => {
    if (!session || !code) return;
    try {
      const res = await roomsApi.claimKinh(code, session.playerId);
      if (res && !res.isValid) {
        setError(res.reason ?? 'Kinh không hợp lệ');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Claim Kinh thất bại');
      refetchState();
    }
  };

  // Manual next turn cho host (fallback nếu BE timeout không fire)
  const handleManualNextTurn = async () => {
    if (!code) return;
    try {
      await roomsApi.nextDrawer(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Next turn thất bại');
    }
  };

  if (!session || !code) return null;

  // ===== Derived =====
  const isHost = session.isHost;
  const isMyTurn = gameState?.currentDrawerId === session.playerId;
  const phase = gameState?.phase ?? 'Idle';
  const currentDrawer = players.find(p => p.id === gameState?.currentDrawerId);
  const cardById = new Map(allCards.map(c => [c.id, c]));

  const phaseLabel = ({
    Idle: 'Chuẩn bị lượt mới...',
    DrawerSelecting: `${currentDrawer?.name ?? '...'} đang chọn câu hỏi`,
    DrawerAnswering: `${currentDrawer?.name ?? '...'} đang trả lời`,
    Stealing: '🔥 GIÀNH QUYỀN TRẢ LỜI',
    Revealing: 'Đang kiểm tra...',
  } as const)[phase];

  let qMode: 'drawer' | 'steal' | 'readonly' = 'readonly';
  if (activeQuestion && !isHost) {
    if (!activeQuestion.isStealMode && isMyTurn) qMode = 'drawer';
    else if (activeQuestion.isStealMode && !isMyTurn) qMode = 'steal';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-yellow-50 p-3 relative overflow-hidden">
      {/* Watermark nền */}
      <div className="fixed inset-0 pointer-events-none select-none flex flex-col items-center justify-center -z-0 opacity-[0.04]">
        <div className="text-[22vw] font-black text-red-700 leading-none tracking-tighter">40</div>
        <div className="text-[3.5vw] font-extrabold text-red-700 uppercase tracking-[0.3em] -mt-4">Năm Đổi Mới</div>
        <div className="text-[2vw] font-bold text-yellow-600 tracking-widest mt-1">1986 – 2026</div>
      </div>
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header với tên + dải player tags */}
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
            <div className={`px-4 py-2 rounded-lg font-bold text-center ${
              phase === 'Stealing' ? 'bg-orange-500 text-white animate-pulse' :
              isMyTurn ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}>{phaseLabel}</div>
            <div className="text-xs text-gray-500">
              <strong>{gameState?.answeredPositions.length ?? 0}</strong> đáp ·&nbsp;
              <strong>{gameState?.lockedPositions.length ?? 0}</strong> khóa /&nbsp;
              <strong>{gameState?.remainingSlots ?? 40}</strong> còn
            </div>
          </div>

          {/* Player tags */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
            <span className="text-xs text-gray-500">Players:</span>
            {players.filter(p => !p.isHost).map(p => {
              const isDrawer = p.id === gameState?.currentDrawerId;
              const isMe = p.id === session.playerId;
              return (
                <span key={p.id} className={`text-xs px-2 py-1 rounded-full font-medium ${
                  isDrawer ? 'bg-red-500 text-white' :
                  isMe ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${p.online ? 'bg-green-400' : 'bg-gray-300'}`} />
                  {p.name}
                  {isDrawer && ' 🎯'}
                  {isMe && ' (bạn)'}
                </span>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex justify-between">
            <span>✗ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 font-bold">×</button>
          </div>
        )}

        {toast && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 text-center font-medium">
            {toast}
          </div>
        )}

        {/* 2-column layout: số đã gọi trái — content phải */}
        <div className="flex gap-3 items-start">
          {/* Left sidebar: Số đã gọi */}
          <div className="w-36 shrink-0">
            <CalledNumbersBar
              called={Array.from(calledNumbers).sort((a, b) => a - b)}
              latest={latestCalled}
              sidebar
            />
          </div>

          {/* Right main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Slot picker (drawer) */}
            {phase === 'DrawerSelecting' && isMyTurn && gameState && (
              <div className="bg-white rounded-xl shadow px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm">🎯 Đến lượt bạn — chọn 1 slot:</h3>
                  <span className="text-xs text-gray-500">Còn {remaining}s {picking && '(đang gửi...)'}</span>
                </div>
                <SlotPickerGrid
                  totalSlots={40}
                  answeredPositions={gameState.answeredPositions}
                  lockedPositions={gameState.lockedPositions}
                  onPick={handlePickSlot}
                  disabled={picking}
                />
              </div>
            )}

            {activeQuestion && (
              <QuestionPanel
                question={activeQuestion.question}
                remaining={remaining}
                onAnswer={handleAnswer}
                disabled={hasAnswered}
                mode={qMode}
              />
            )}

            {/* Player: my card (giữa) + KINH button (phải, top-aligned) */}
            {!isHost && myCard && (
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="max-w-xs mx-auto sm:max-w-sm">
                    <GameCard
                      card={myCard}
                      marked={markedNumbers}
                      called={calledNumbers}
                      onMark={handleMark}
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

            {/* Host TV view */}
            {isHost && (
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">
                    📺 TV View — {players.filter(p => !p.isHost).length} người chơi
                  </h3>
                  {(phase === 'Revealing' || phase === 'Idle') && (
                    <button
                      onClick={handleManualNextTurn}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold"
                    >
                      ⏭ Chuyển lượt (manual)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {players.filter(p => !p.isHost).map(p => {
                    const card = p.cardId ? cardById.get(p.cardId) : null;
                    const marks = new Set(p.markedNumbers ?? []);
                    return (
                      <div key={p.id} className={`border-2 rounded-lg p-2 ${
                        p.id === gameState?.currentDrawerId
                          ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-xs font-semibold truncate flex-1">{p.name}</span>
                          <span className="text-xs text-gray-500">{marks.size}/25</span>
                        </div>
                        {card ? (
                          <div className="grid grid-cols-5 gap-px">
                            {card.grid.flat().map((n, i) => (
                              <div key={i} className={`aspect-square flex items-center justify-center text-[9px] rounded ${
                                marks.has(n) ? 'bg-red-500 text-white font-bold' :
                                calledNumbers.has(n) ? 'bg-yellow-100' : 'bg-white text-gray-600'
                              }`}>{n}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic text-center py-4">Không có card</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Idle / waiting */}
            {!activeQuestion && phase !== 'DrawerSelecting' && (
              <div className="text-center text-gray-500 italic text-sm py-4">
                Đợi lượt tiếp theo...
              </div>
            )}
            {phase === 'DrawerSelecting' && !isMyTurn && (
              <div className="text-center text-gray-500 italic text-sm py-4">
                ⏳ Đợi {currentDrawer?.name ?? '...'} chọn câu hỏi ({remaining}s)
              </div>
            )}
          </div>
        </div>
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