import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { getRedisClient } from '../../common/redis.factory';
import {
  getCachedAuthUser,
  setCachedAuthUser,
} from '../../common/auth-user-cache';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const LAST_SEEN_TTL_SECONDS = 60;

// PERF-007: bound the no-Redis fallback so it can't grow without limit on a
// long-lived single-replica process.
const LAST_SEEN_FALLBACK_MAX = 10_000;

// Fallback in-memory throttle used when Redis is not configured (local dev /
// single-replica). With Redis, each replica independently checks the shared
// key so the 60s window is enforced globally, not per-process.
const lastSeenFallbackMap = new Map<string, number>();

async function shouldUpdateLastSeen(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    // SET key 1 EX 60 NX — only succeeds if the key doesn't already exist
    const result = await redis.set(
      `lastseen:${userId}`,
      '1',
      'EX',
      LAST_SEEN_TTL_SECONDS,
      'NX',
    );
    return result === 'OK'; // 'OK' = key was set (not already present)
  }

  // Fallback: in-memory throttle (per-replica — acceptable for dev), bounded.
  const now = Date.now();
  const last = lastSeenFallbackMap.get(userId) ?? 0;
  if (now - last < LAST_SEEN_TTL_SECONDS * 1000) return false;
  if (
    lastSeenFallbackMap.size >= LAST_SEEN_FALLBACK_MAX &&
    !lastSeenFallbackMap.has(userId)
  ) {
    const oldest = lastSeenFallbackMap.keys().next().value;
    if (oldest !== undefined) lastSeenFallbackMap.delete(oldest);
  }
  lastSeenFallbackMap.set(userId, now);
  return true;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookies = req?.cookies as Record<string, string> | undefined;
          return cookies?.['accessToken'] ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer: 'getx.live',
      audience: 'getx-api',
    });
  }

  async validate(payload: JwtPayload) {
    // PERF-002: serve the projected user row from the short-TTL cache on a hit;
    // fall back to the DB (source of truth) on a miss and populate the cache.
    let user = await getCachedAuthUser(payload.sub);
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          kycLevel: true,
          kycStatus: true,
          country: true,
          name: true,
          avatar: true,
          passwordChangedAt: true,
        },
      });
      if (user) await setCachedAuthUser(payload.sub, user);
    }

    if (!user) throw new UnauthorizedException('User not found');
    if (user.status === 'BANNED')
      throw new UnauthorizedException('Account banned');
    if (user.status === 'DELETED')
      throw new UnauthorizedException('Account deleted');
    if (user.status === 'SUSPENDED')
      throw new UnauthorizedException('Account suspended');

    /* Invalidate tokens issued before the last password change. After a
       password reset every still-valid access token gets rejected on
       its next request — stolen credentials cannot outlive the reset.
       1-second grace handles tokens issued in the same second as the
       reset write (iat is whole seconds, passwordChangedAt is ms). */
    if (user.passwordChangedAt && typeof payload.iat === 'number') {
      const issuedAtMs = payload.iat * 1000;
      if (issuedAtMs + 1000 < user.passwordChangedAt.getTime()) {
        throw new UnauthorizedException(
          'Session expired due to password change. Please login again.',
        );
      }
    }

    void this.touchLastSeen(user.id);

    const { passwordChangedAt: _pca, ...safe } = user;
    return safe;
  }

  /* Fire-and-forget — never blocks the request, never crashes the auth flow.
     When REDIS_URL is set, the 60s gate is shared across all API replicas via
     Redis SETNX so lastSeenAt writes are deduplicated globally, not per-pod. */
  private touchLastSeen(userId: string): void {
    shouldUpdateLastSeen(userId)
      .then((should) => {
        if (!should) return;
        return this.prisma.user
          .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
          .catch(() => { /* swallow — stale lastSeenAt is acceptable */ });
      })
      .catch(() => { /* swallow Redis errors */ });
  }
}
