'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

/* usePresence — subscribes to `presence:user:${userId}` events from the
   /chat WS namespace. Returns `{ isOnline, lastSeenAt }` for any userId.

   The hook seeds `isOnline` from the server-rendered `initialLastSeenAt`
   (within the 5-minute window) so the dot is correct on first paint, then
   live-updates as the socket pushes online/offline transitions. */

interface UsePresenceArgs {
  userId: string | null | undefined;
  initialLastSeenAt?: string | null;
}

interface PresenceState {
  isOnline: boolean;
  lastSeenAt: string | null;
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function computeInitial(lastSeenAt: string | null | undefined): PresenceState {
  if (!lastSeenAt) return { isOnline: false, lastSeenAt: null };
  const ms = Date.parse(lastSeenAt);
  if (Number.isNaN(ms)) return { isOnline: false, lastSeenAt };
  const isOnline = Date.now() - ms < ONLINE_WINDOW_MS;
  return { isOnline, lastSeenAt };
}

export function usePresence({
  userId,
  initialLastSeenAt = null,
}: UsePresenceArgs): PresenceState {
  const [state, setState] = useState<PresenceState>(() =>
    computeInitial(initialLastSeenAt),
  );

  /* Re-seed when the user prop flips or the API returns a fresher seen
     timestamp (e.g. cache revalidates). */
  useEffect(() => {
    setState(computeInitial(initialLastSeenAt));
  }, [initialLastSeenAt, userId]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    const event = `presence:user:${userId}`;

    const onPresence = (data: { userId: string; isOnline: boolean; at: string }) => {
      if (data.userId !== userId) return;
      setState({
        isOnline: data.isOnline,
        lastSeenAt: data.at,
      });
    };

    socket.on(event, onPresence);
    return () => {
      socket.off(event, onPresence);
    };
  }, [userId]);

  return state;
}

/* Formats a "last seen" timestamp into the buyer-facing label.
   < 1m   → "Online now" (when isOnline)
   < 1h   → "Last seen Nm ago"
   < 24h  → "Last seen Nh ago"
   ≥ 24h  → "Active recently"  */
export function formatLastSeen(
  isOnline: boolean,
  lastSeenAt: string | null,
): string {
  if (isOnline) return 'Online now';
  if (!lastSeenAt) return 'Active recently';
  const ms = Date.parse(lastSeenAt);
  if (Number.isNaN(ms)) return 'Active recently';
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return 'Active recently';
}
