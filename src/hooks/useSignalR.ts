import { useEffect, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { HUB_URL } from '../config';

type EventHandler = (data: any) => void;
type Handlers = Record<string, EventHandler>;

interface UseSignalROptions {
  roomCode: string | null;
  clientId: string | null;
  handlers: Handlers;
  onReconnected?: () => void;
  enabled?: boolean;
}

/**
 * Custom hook: connect tới SignalR hub, đăng ký event handlers, tự cleanup.
 * @param roomCode  - mã phòng để join group
 * @param clientId  - id người chơi (host hoặc player)
 * @param handlers  - dict { eventName: callback }
 * @param enabled   - chỉ connect khi true (mặc định true)
 */
export function useSignalR({ roomCode, clientId, handlers, onReconnected, enabled = true }: UseSignalROptions) {
  const connRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (!enabled || !roomCode) return;

    const url = `${HUB_URL}?roomCode=${roomCode}&clientId=${clientId ?? ''}`;
    const conn = new HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect([0, 2000, 5000, 10000])   // retry sau 0s, 2s, 5s, 10s
      .build();

    Object.entries(handlers).forEach(([event, fn]) => conn.on(event, fn));

    conn.onclose(err => {
      console.warn('[SignalR] Closed:', err?.message ?? 'normal close');
    });

    if (onReconnected) {
      conn.onreconnected(() => onReconnected());
    }

    conn.start()
  .then(() => console.log('[SignalR] Connected', conn.connectionId))
  .catch(err => {
    // Negotiation abort thường do StrictMode/HMR — ignore
    if (err?.message?.includes('negotiation')) return;
    console.error('[SignalR] Connect failed:', err);
  });

    connRef.current = conn;

    return () => {
      if (conn.state !== HubConnectionState.Disconnected) {
        conn.stop().catch(() => { });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, clientId, enabled]);

  return connRef;
}