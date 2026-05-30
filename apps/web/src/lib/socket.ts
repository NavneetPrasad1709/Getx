import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let tokenPromise: Promise<string | undefined> | null = null;

function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_DIRECT_URL;
  // WEB-MED-018: throw in production so misconfigured deploys are immediately
  // visible rather than silently connecting to localhost:4000
  if (!apiUrl && process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_WS_URL or NEXT_PUBLIC_API_DIRECT_URL must be set in production',
    );
  }
  return (apiUrl ?? 'http://localhost:4000').replace(/\/api\/v1\/?$/, '');
}

interface RateLimitPayload {
  event: string;
  retryAfterMs: number;
}

async function fetchWsToken(): Promise<string | undefined> {
  try {
    const res = await fetch('/api/v1/auth/ws-token', { credentials: 'include' });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { token?: string | null };
    return data.token ?? undefined;
  } catch {
    return undefined;
  }
}

export function initSocket(): void {
  if (socket) return;
  tokenPromise = fetchWsToken();
  tokenPromise.then((token) => {
    if (socket) return;
    socket = io(`${getSocketUrl()}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      ...(token ? { auth: { token } } : {}),
    });

    socket.on('rate_limit_exceeded', (data: RateLimitPayload) => {
      console.warn(
        `[chat] rate limit hit on "${data.event}", retry in ${Math.ceil(data.retryAfterMs / 1000)}s`,
      );
    });
  });
}

export function getSocket(): Socket {
  if (!socket) {
    initSocket();
    // Return a not-yet-connected socket immediately — io() queues emits
    // until the connection is live, so callers don't need to await.
    if (!socket) {
      socket = io(`${getSocketUrl()}/chat`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });
    }
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    tokenPromise = null;
  }
}
