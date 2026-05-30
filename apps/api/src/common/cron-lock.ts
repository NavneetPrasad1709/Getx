import { randomBytes } from 'crypto';
import { getRedisClient } from './redis.factory';

/* PERF-012 / ARCH-004 — cron leader election.

   @nestjs/schedule fires every cron on EVERY replica. For idempotent reads
   that is merely wasteful, but these jobs move money / change account state
   (escrow auto-release, sanctions suspension, GDPR anonymisation) — running
   them concurrently on N replicas means N× the work and real race windows.

   withCronLock acquires a short-lived Redis lock (SET NX PX) so exactly one
   replica runs the tick; the others no-op. With no REDIS_URL we assume a
   single replica and run unconditionally (the dev/default case). The lock is
   released with a compare-and-delete (Lua) so a slow job can never delete a
   lock a later tick has already re-acquired. */

// Atomic release: only delete the key if we still own it.
const RELEASE_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export async function withCronLock<T>(
  name: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const redis = getRedisClient();
  // Single-replica / dev: no coordination needed.
  if (!redis) return fn();

  const key = `cronlock:${name}`;
  const token = randomBytes(16).toString('hex');

  let acquired = false;
  try {
    acquired = (await redis.set(key, token, 'PX', ttlMs, 'NX')) === 'OK';
  } catch {
    /* Redis unavailable — fail OPEN so the job still runs. A duplicate run is
       safer than skipping money-moving sweeps entirely; the jobs themselves
       are written idempotently (e.g. releaseToSeller no-ops when RELEASED). */
    return fn();
  }

  if (!acquired) return undefined; // another replica holds the lock this tick

  try {
    return await fn();
  } finally {
    try {
      await redis.eval(RELEASE_LUA, 1, key, token);
    } catch {
      // Lock will expire on its own via PX; nothing actionable here.
    }
  }
}
