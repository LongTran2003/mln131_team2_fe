import { useEffect, useState } from 'react';

/** Countdown seconds từ ISO deadline. Tick mỗi 200ms, trả về 0 khi hết. */
export function useCountdown(deadline: string | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) { setRemaining(0); return; }
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
}