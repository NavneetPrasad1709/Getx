import type { Redis } from 'ioredis';
import type { ThrottlerStorage } from '@nestjs/throttler';

// Shape of @nestjs/throttler's ThrottlerStorageRecord (not re-exported from the
// package index, so mirrored here). timeToExpire / timeToBlockExpire are in
// SECONDS even though ttl arrives in milliseconds.
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/* ARCH-004 / AUTH-006 / PERF-001 — cross-replica rate limiting.

   The default @nestjs/throttler store is an in-process Map: with >1 API
   replica each pod counts independently, so the effective limit is N×config
   and login/checkout/withdraw throttles are trivially bypassed by spreading
   requests. This storage moves the counter into Redis so the window is shared
   by every replica.

   No new dependency: ioredis is already used for the socket adapter and the
   last-seen throttle. Implemented as a fixed-window limiter via a tiny atomic
   Lua script (INCR + first-hit PEXPIRE).

   UNIT CONTRACT (matched to @nestjs/throttler's in-memory store): ttl and
   blockDuration arrive in MILLISECONDS, but timeToExpire / timeToBlockExpire
   must be returned in SECONDS. Getting this wrong makes Retry-After headers
   1000× too large. */

// KEYS[1] = window key, ARGV[1] = ttl (ms). Returns { totalHits, pttl(ms) }.
const INCREMENT_LUA = `
local hits = redis.call('INCR', KEYS[1])
local pttl = redis.call('PTTL', KEYS[1])
if pttl <= 0 then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
  pttl = tonumber(ARGV[1])
end
return { hits, pttl }
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = 'throttle',
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const windowKey = `${this.prefix}:${throttlerName}:${key}`;
    try {
      const [hits, pttlMs] = (await this.redis.eval(
        INCREMENT_LUA,
        1,
        windowKey,
        String(ttl),
      )) as [number, number];

      const totalHits = Number(hits);
      const timeToExpire = Math.ceil(Number(pttlMs) / 1000);
      const isBlocked = totalHits > limit;
      return {
        totalHits,
        timeToExpire,
        isBlocked,
        // Block for the remainder of the window — we don't configure a separate
        // blockDuration anywhere, so the fixed window IS the block.
        timeToBlockExpire: isBlocked ? timeToExpire : 0,
      };
    } catch {
      /* Fail OPEN. A Redis blip must never convert into a wall of false 429s
         that takes the whole API down; the in-memory guard on each replica
         still provides a (looser) backstop. */
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
