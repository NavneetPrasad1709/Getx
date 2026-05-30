import { Injectable } from '@nestjs/common';
import { getRedisClient } from '../common/redis.factory';

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

interface LimitConfig {
  max: number;
  windowMs: number;
}

export type SocketRateLimitEvent =
  | 'send_message'
  | 'typing'
  | 'mark_read'
  | 'join_conversation'
  | 'leave_conversation';

/**
 * Per-user, per-event-type rate limiter for WebSocket events.
 *
 * BE-01: when REDIS_URL is set the counter is a shared Redis fixed-window
 * (INCR + PEXPIRE) so the limit holds across every API replica; otherwise it
 * falls back to the in-process Map (single-replica / dev). Either way `consume`
 * is async so the gateway awaits the decision before handling the event.
 */
@Injectable()
export class SocketRateLimiter {
  private buckets = new Map<string, RateLimitWindow>();

  private readonly limits: Record<SocketRateLimitEvent, LimitConfig> = {
    send_message: { max: 30, windowMs: 60_000 },
    typing: { max: 60, windowMs: 60_000 },
    mark_read: { max: 60, windowMs: 60_000 },
    join_conversation: { max: 30, windowMs: 60_000 },
    leave_conversation: { max: 30, windowMs: 60_000 },
  };

  async consume(
    userId: string,
    event: SocketRateLimitEvent,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const config = this.limits[event];

    const redis = getRedisClient();
    if (redis) {
      try {
        const key = `wsrl:${userId}:${event}`;
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, config.windowMs);
        if (count > config.max) {
          const ttl = await redis.pttl(key);
          return {
            allowed: false,
            retryAfterMs: ttl > 0 ? ttl : config.windowMs,
          };
        }
        return { allowed: true };
      } catch {
        // Fail open to the in-memory path below on any Redis error.
      }
    }

    return this.consumeInMemory(userId, event, config);
  }

  private consumeInMemory(
    userId: string,
    event: SocketRateLimitEvent,
    config: LimitConfig,
  ): { allowed: boolean; retryAfterMs?: number } {
    const key = `${userId}:${event}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true };
    }

    if (bucket.count >= config.max) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count++;
    return { allowed: true };
  }

  /**
   * Drop expired buckets. Called from a 5-minute interval set up in
   * ConversationsModule's lifecycle hooks.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt < now) {
        this.buckets.delete(key);
      }
    }
  }

  /** Test helper: clear all buckets. */
  reset(): void {
    this.buckets.clear();
  }
}
