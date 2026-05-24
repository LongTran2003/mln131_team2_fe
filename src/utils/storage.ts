export interface Session {
  playerId: string;
  playerName: string;
  isHost: boolean;
  roomCode: string;
  cardId?: string;
  cardGrid?: number[][];
}

// Tab-specific key: mỗi tab có tabId riêng trong sessionStorage,
// session thật vẫn nằm trong localStorage (persist qua refresh).
const getTabId = (): string => {
  let id = window.sessionStorage.getItem('loto:tabId');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    window.sessionStorage.setItem('loto:tabId', id);
  }
  return id;
};

const getKey = () => `loto:session:${getTabId()}`;

export const storage = {
  save: (s: Session) => localStorage.setItem(getKey(), JSON.stringify(s)),
  load: (): Session | null => {
    const v = localStorage.getItem(getKey());
    return v ? JSON.parse(v) as Session : null;
  },
  clear: () => localStorage.removeItem(getKey()),
  update: (patch: Partial<Session>) => {
    const s = storage.load();
    if (s) storage.save({ ...s, ...patch });
  },
};