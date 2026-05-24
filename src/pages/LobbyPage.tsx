import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsApi } from '../api/rooms';
import { useSignalR } from '../hooks/useSignalR';
import { storage, type Session } from '../utils/storage';
import type { CardDto, PlayerDto } from '../types';
import { CardPreview } from '../components/CardPreview';
import { PlayerList } from '../components/PlayerList';

export function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(() => storage.load());

  useEffect(() => {
    if (!session || !code || session.roomCode !== code) {
      navigate('/', { replace: true });
    }
  }, [session, code, navigate]);

  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [cards, setCards] = useState<CardDto[]>([]);
  const [myCard, setMyCard] = useState<CardDto | null>(null);
  const [hostId, setHostId] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!code || !session) return;
    try {
      const [room, playersList, cardsList] = await Promise.all([
        roomsApi.get(code),
        roomsApi.getPlayers(code),
        roomsApi.getAvailableCards(code),
      ]);
      setHostId(room.hostId);
      setPlayers(playersList);
      setCards(cardsList);

      // Tìm card của mình (nếu có) trong full list từ players
      const me = playersList.find(p => p.id === session.playerId);
      if (me?.cardId) {
        // Card đã pick không nằm trong available list nữa, fetch riêng qua getByIdInList workaround
        // Cách đơn giản: load all cards (cả picked) - cần BE endpoint mới HOẶC dùng player.cardId làm hint
        // Tạm thời: nếu chưa có myCard hoặc cardId thay đổi → mark cần lấy
        // Trick: pick lại → BE trả về grid trong response. Lưu vào session.
        // Còn lúc load lại trang, không có sẵn → hiển thị placeholder.
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load thất bại');
    }
  }, [code, session]);

  useEffect(() => { loadData(); }, [loadData]);

  // Restore myCard từ session khi F5 reload trang
  useEffect(() => {
    if (session?.cardId && session?.cardGrid && !myCard) {
      setMyCard({
        id: session.cardId,
        grid: session.cardGrid,
        ownerId: session.playerId,
        isAvailable: false,
    });
  }
}, [session?.cardId, session?.cardGrid, session?.playerId, myCard]);

  const handlers = useMemo(() => ({
    PlayerJoined: (player: PlayerDto) => {
      setPlayers(prev =>
        prev.some(p => p.id === player.id) ? prev : [...prev, player]
      );
    },
    GameStarted: () => navigate(`/game/${code}`),
  }), [code, navigate]);

  useSignalR({
    roomCode: code ?? null,
    clientId: session?.playerId ?? null,
    handlers,
    enabled: !!session && !!code,
  });

  const handlePickCard = async (card: CardDto) => {
    if (!session || !code) return;
    setError(null);
    try {
      const res = await roomsApi.pickCard(code, card.id, session.playerId);
      if (!res.success) {
        setError('Card đã bị người khác pick. Đang refresh...');
        await loadData();
        return;
      }
      const updated = { ...session, cardId: card.id, cardGrid: card.grid };
      setSession(updated);
      storage.save(updated);
      setMyCard(card);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pick card thất bại');
    }
  };

  const handleChangeCard = async () => {
    if (!session || !code) return;
    setError(null);
    try {
      await roomsApi.unpickCard(code, session.playerId);
      const updated = { ...session, cardId: undefined, cardGrid: undefined };
      setSession(updated);
      storage.save(updated);
      setMyCard(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đổi card thất bại');
    }
  };

  const handleStartGame = async () => {
    if (!session || !code) return;
    setStarting(true); setError(null);
    try {
      await roomsApi.startGame(code, session.playerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Start game thất bại');
      setStarting(false);
    }
  };

  const handleLeave = () => {
    storage.clear();
    navigate('/', { replace: true });
  };

  if (!session || !code) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-yellow-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">🎲 Phòng lô tô</h1>
              <p className="text-sm text-gray-500 mt-1">
                <strong>{players.length}</strong> người chơi
                {session.isHost && <span className="ml-2 text-yellow-700">• Bạn là host</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center bg-yellow-100 rounded-lg px-6 py-3">
                <div className="text-xs text-gray-500">Mã phòng</div>
                <div className="text-3xl font-bold tracking-widest font-mono">{code}</div>
              </div>
              <button onClick={handleLeave} className="text-sm text-gray-500 hover:text-red-600 underline">
                Rời phòng
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              ✗ {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Players */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-4 h-fit">
            <h2 className="font-bold mb-3">👥 Người chơi</h2>
            <PlayerList players={players} hostId={hostId} currentPlayerId={session.playerId} />

            {session.isHost ? (
              <button
                onClick={handleStartGame}
                disabled={starting || players.length < 2}
                className="w-full mt-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition"
              >
                {starting ? 'Đang start...' : `Bắt đầu (${players.length} người)`}
              </button>
            ) : (
              <p className="mt-4 text-sm text-gray-500 text-center italic">
                Đợi host bắt đầu...
              </p>
            )}
          </div>

          {/* Card area */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-4">
            {session.cardId && myCard ? (
              // ============ CONFIRMATION VIEW ============
              <div className="text-center">
                <h2 className="font-bold text-xl mb-1">✓ Đã chọn card</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Nhớ kỹ card này để theo dõi khi game bắt đầu
                </p>
                <div className="max-w-sm mx-auto">
                  <CardPreview card={myCard} selected size="lg" />
                </div>
                <button
                  onClick={handleChangeCard}
                  className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                >
                  ← Đổi card khác
                </button>
                <p className="mt-4 text-sm text-gray-500 italic">
                  {session.isHost ? 'Khi đủ người, click "Bắt đầu" bên trái.' : 'Đợi host bắt đầu game.'}
                </p>
              </div>
            ) : (
              // ============ PICKER VIEW ============
              <>
                <h2 className="font-bold mb-3">
                  Chọn 1 card ({cards.length}/50 còn lại)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[75vh] overflow-y-auto pr-2">
                  {cards.map(card => (
                    <CardPreview
                      key={card.id}
                      card={card}
                      onClick={() => handlePickCard(card)}
                      size="md"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}