import { getRedisClient } from './redis.factory';

/* PERF — shared cache-aside layer.

   Prefers Redis when REDIS_URL is set (cross-replica, invalidation via DEL
   propagates to every pod). Without Redis it falls back to a BOUNDED in-process
   LRU so a no-Redis dev/single-replica deploy still gets the win without an
   unbounded memory leak (the old hand-rolled Maps grew forever — PERF-007).

   Redis is authoritative when present: a Redis miss returns null and does NOT
   consult the LRU (avoids serving a stale local copy after a cross-replica
   invalidation). The LRU is only used when Redis is absent or erroring. */

const LRU_MAX = 5_000;

interface LruEntry {
  value: unknown;
  expiresAt: number;
}

const lru = new Map<string, LruEntry>();

function lruGet(key: string): unknown | undefined {
  const entry = lru.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    lru.delete(key);
    return undefined;
  }
  // Touch for recency (Map preserves insertion order → re-insert = most recent).
  lru.delete(key);
  lru.set(key, entry);
  return entry.value;
}

function lruSet(key: string, value: unknown, ttlSeconds: number): void {
  if (lru.size >= LRU_MAX && !lru.has(key)) {
    const oldest = lru.keys().next().value;
    if (oldest !== undefined) lru.delete(oldest);
  }
  lru.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      // fall through to LRU on a Redis error
    }
  }
  const value = lruGet(key);
  return value === undefined ? null : (value as T);
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch {
      // fall through to LRU
    }
  }
  lruSet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // best-effort
    }
  }
  // Always clear any local copy too (covers the Redis-erroring window).
  lru.delete(key);
}

/** Cache-aside: return the cached value or compute, cache, and return it. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Test helper — clears the in-process LRU. */
export function __clearLru(): void {
  lru.clear();
}
