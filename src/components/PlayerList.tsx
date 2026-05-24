import type { PlayerDto } from '../types';

interface Props {
  players: PlayerDto[];
  hostId: string;
  currentPlayerId: string;
}

export function PlayerList({ players, hostId, currentPlayerId }: Props) {
  return (
    <div className="space-y-1">
      {players.map(p => (
        <div
          key={p.id}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
            p.id === currentPlayerId ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="font-medium flex-1 truncate">{p.name}</span>
          {p.id === hostId && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">Host</span>
          )}
          {p.id === currentPlayerId && <span className="text-xs text-gray-500">(bạn)</span>}
          {p.cardId && <span className="text-xs text-green-600">✓</span>}
        </div>
      ))}
    </div>
  );
}