// Hash deterministic từ string → number trong [0, max)
function hash(str: string, max: number, salt = ''): number {
  let h = 0;
  const s = str + salt;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % max;
}

const EMOJIS = [
  '🦊','🐱','🐶','🐰','🐻','🐼','🐨','🦁','🐯','🐮',
  '🐷','🐴','🦓','🐘','🐪','🦒','🐒','🦔','🐺','🦝',
  '🐹','🐔','🐧','🦅','🦉','🦜','🦢','🦩','🐊','🐢',
  '🐍','🐙','🐠','🐳','🦈','🐝','🐛','🦋','🐞','🐜',
  '🦕','🦖','🌟','🌈','🍎','🍊','🍋','🍇','🍑','🍓',
];

// Tailwind không support dynamic class names → phải map tĩnh
const THEMES = [
  { bg: 'bg-red-50',     border: 'border-red-300',     accent: 'bg-red-100'     },
  { bg: 'bg-orange-50',  border: 'border-orange-300',  accent: 'bg-orange-100'  },
  { bg: 'bg-amber-50',   border: 'border-amber-300',   accent: 'bg-amber-100'   },
  { bg: 'bg-lime-50',    border: 'border-lime-300',    accent: 'bg-lime-100'    },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', accent: 'bg-emerald-100' },
  { bg: 'bg-cyan-50',    border: 'border-cyan-300',    accent: 'bg-cyan-100'    },
  { bg: 'bg-sky-50',     border: 'border-sky-300',     accent: 'bg-sky-100'     },
  { bg: 'bg-indigo-50',  border: 'border-indigo-300',  accent: 'bg-indigo-100'  },
  { bg: 'bg-violet-50',  border: 'border-violet-300',  accent: 'bg-violet-100'  },
  { bg: 'bg-pink-50',    border: 'border-pink-300',    accent: 'bg-pink-100'    },
];

export interface CardTheme {
  emoji: string;
  label: string;
  bg: string;
  border: string;
  accent: string;
}

export function getCardTheme(cardId: string): CardTheme {
  const emoji = EMOJIS[hash(cardId, EMOJIS.length)];
  const theme = THEMES[hash(cardId, THEMES.length, 'color')];
  // Mã ngắn cuối cardId cho label (4 ký tự cuối UUID)
  const shortCode = cardId.slice(-4).toUpperCase();
  return {
    emoji,
    label: `Card #${shortCode}`,
    ...theme,
  };
}