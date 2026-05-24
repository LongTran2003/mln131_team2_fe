import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsApi } from '../api/rooms';
import { storage } from '../utils/storage';

type Mode = 'create' | 'join';

export function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('join');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await roomsApi.create({ hostName: name.trim() });
      storage.save({
        playerId: res.hostId,
        playerName: res.hostName,
        isHost: true,
        roomCode: res.roomCode,
      });
      navigate(`/lobby/${res.roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo phòng thất bại');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!name.trim() || !roomCode.trim()) return;
    setLoading(true); setError(null);
    try {
      const code = roomCode.trim().toUpperCase();
      const res = await roomsApi.join(code, { clientId: null, playerName: name.trim() });
      storage.save({
        playerId: res.playerId,
        playerName: res.name,
        isHost: false,
        roomCode: res.roomCode,
      });
      navigate(`/lobby/${res.roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vào phòng thất bại');
    } finally { setLoading(false); }
  };

  const canSubmit = name.trim() && (mode === 'create' || roomCode.trim().length === 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">🎲 Lô Tô VK XIV</h1>
        <p className="text-center text-gray-500 mb-6">40 năm Đổi mới — MLN131 Team 2</p>

        {/* Mode switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
          {(['join', 'create'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === m
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-gray-500 hover:bg-white/70 hover:text-gray-700'
              }`}
            >
              {m === 'create' ? 'Tạo phòng' : 'Vào phòng'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium mb-1">Mã phòng</label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABCD12"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 uppercase tracking-[0.3em] font-mono text-center text-xl"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Tên của bạn</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={15}
              placeholder="VD: Long"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            disabled={loading || !canSubmit}
            className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition"
          >
            {loading ? 'Đang xử lý...' : mode === 'create' ? 'Tạo phòng mới' : 'Vào phòng'}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              ✗ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}