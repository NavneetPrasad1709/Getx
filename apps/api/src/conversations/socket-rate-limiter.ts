import { Injectable } from '@nestjs/common';

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
 * In-memory token-bucket rate limiter for WebSocket events. Per-user,
 * per-event-type. Single-process — for multi-replica production replace
 * the Map with a Redis-backed counter (INCR + EXPIRE).
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

  consume(
    userId: string,
    event: SocketRateLimitEvent,
  ): { allowed: boolean; retryAfterMs?: number } {
    const config = this.limits[event];
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
