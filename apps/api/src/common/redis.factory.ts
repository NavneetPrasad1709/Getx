import Redis from 'ioredis';

let client: Redis | null = null;

/**
 * Returns a shared ioredis client when REDIS_URL is configured, or null
 * when Redis is not available (single-replica dev / CI environments).
 *
 * Callers must guard against null:
 *   const redis = getRedisClient();
 *   if (redis) { ... }
 *
 * The singleton pattern keeps the connection count stable; NestJS
 * lifecycle hooks cannot reach this directly, so we use a module-level
 * variable. The process will naturally close the socket on exit.
 */
export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    try {
      client = new Redis(url, {
        // Reconnect up to 10 times with exponential back-off before giving up.
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) =>
          times >= 10 ? null : Math.min(times * 100, 3000),
        lazyConnect: false,
      });

      client.on('connect', () => console.log('[Redis] Connected'));
      // MUST keep an 'error' listener — an ioredis client with none throws an
      // UNHANDLED 'error' event that crashes the process when Redis is down.
      client.on('error', (err: Error) =>
        console.error('[Redis] Connection error:', err.message),
      );
    } catch (err) {
      // A malformed REDIS_URL must never take the whole API down at boot —
      // degrade to the no-Redis (single-replica / in-memory) path instead.
      console.error(
        '[Redis] Failed to create client (continuing without Redis):',
        err instanceof Error ? err.message : String(err),
      );
      client = null;
      return null;
    }
  }

  return client;
}
