import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/* In-memory throttle for lastSeenAt writes — never touch the DB more than
   once per user per LAST_SEEN_THROTTLE_MS. Matches the SocketRateLimiter
   pattern already in use; swap to Redis when the API goes multi-replica. */
const LAST_SEEN_THROTTLE_MS = 60 * 1000;
const lastSeenWrites = new Map<string, number>();

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
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
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
     Errors are swallowed because lastSeenAt is a soft-signal field. */
  private touchLastSeen(userId: string): void {
    const now = Date.now();
    const lastWrite = lastSeenWrites.get(userId) ?? 0;
    if (now - lastWrite < LAST_SEEN_THROTTLE_MS) return;
    lastSeenWrites.set(userId, now);
    this.prisma.user
      .update({ where: { id: userId }, data: { lastSeenAt: new Date(now) } })
      .catch(() => {
        /* swallow — stale lastSeenAt is acceptable */
      });
  }
}
