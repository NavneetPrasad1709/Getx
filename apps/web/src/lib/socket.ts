import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

interface RateLimitPayload {
  event: string;
  retryAfterMs: number;
}

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;

  socket = io(`${getSocketUrl()}/chat`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Server emits this when WS rate limit is hit (per user/event). Surfaced
  // here so any feature can react. UI toast is intentionally not dispatched
  // — components decide what to do with the warning.
  socket.on('rate_limit_exceeded', (data: RateLimitPayload) => {
    console.warn(
      `[chat] rate limit hit on "${data.event}", retry in ${Math.ceil(data.retryAfterMs / 1000)}s`,
    );
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
