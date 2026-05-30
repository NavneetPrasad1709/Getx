import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

/* Focused unit tests for the two money-/identity-adjacent auth behaviours
   changed in the Phase 2 hardening pass:
     - AUTH-011: the WS ticket is scoped (aud: getx-ws) and short-lived, and is
       NOT accepted as an API access token (aud: getx-api).
     - AUTH-003: refresh rotation preserves the ABSOLUTE session expiry instead
       of resetting the window to 7 days on every refresh. */

const TEST_SECRET = 'test-access-secret-at-least-32-chars-long-xx';

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    JWT_ACCESS_SECRET: TEST_SECRET,
    JWT_ACCESS_EXPIRES: '15m',
    NODE_ENV: 'test',
    COOKIE_DOMAIN: undefined,
    ...overrides,
  };
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

describe('AuthService.issueWsTicket (AUTH-011)', () => {
  const jwt = new JwtService({});
  const service = new AuthService(
    {} as never,
    jwt,
    makeConfig(),
    {} as never,
    {} as never,
  );

  it('issues a WS-scoped ticket the gateway accepts', async () => {
    const { token } = await service.issueWsTicket('user-1');
    const payload = await jwt.verifyAsync<{ sub: string; type: string }>(token, {
      secret: TEST_SECRET,
      algorithms: ['HS256'],
      issuer: 'getx.live',
      audience: 'getx-ws',
    });
    expect(payload.sub).toBe('user-1');
    expect(payload.type).toBe('ws');
  });

  it('expires in ~60s (bounded handshake replay window)', async () => {
    const { token } = await service.issueWsTicket('user-1');
    const payload = await jwt.verifyAsync<{ iat: number; exp: number }>(token, {
      secret: TEST_SECRET,
      audience: 'getx-ws',
    });
    expect(payload.exp - payload.iat).toBe(60);
  });

  it('is REJECTED as an API access token (audience isolation)', async () => {
    const { token } = await service.issueWsTicket('user-1');
    await expect(
      jwt.verifyAsync(token, {
        secret: TEST_SECRET,
        algorithms: ['HS256'],
        issuer: 'getx.live',
        audience: 'getx-api', // what JwtAuthGuard / JwtStrategy require
      }),
    ).rejects.toThrow();
  });
});

describe('AuthService.refresh (AUTH-003 absolute-expiry preservation)', () => {
  const DAY = 24 * 60 * 60 * 1000;

  function setup(originalExpiresAt: Date) {
    const created: Array<{ expiresAt: Date }> = [];
    const cookies: Array<{ name: string; opts: { maxAge?: number } }> = [];

    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          revoked: false,
          family: 'fam1',
          expiresAt: originalExpiresAt,
          userId: 'u1',
          user: { id: 'u1', email: 'a@b.com', role: 'BOTH', status: 'ACTIVE' },
        }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation((args: { data: { expiresAt: Date } }) => {
          created.push(args.data);
          return Promise.resolve({});
        }),
      },
    };

    const res = {
      cookie: jest.fn((name: string, _v: string, opts: { maxAge?: number }) => {
        cookies.push({ name, opts });
      }),
    } as unknown as Response;
    const req = { ip: '1.2.3.4', headers: {} } as unknown as Request;

    const service = new AuthService(
      prisma as never,
      new JwtService({}),
      makeConfig(),
      {} as never,
      {} as never,
    );
    return { service, req, res, created, cookies };
  }

  it('carries the original expiry forward on rotation (does not reset to 7d)', async () => {
    // A 24h (non-remember-me) session, 1h elapsed.
    const originalExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
    const { service, req, res, created, cookies } = setup(originalExpiresAt);

    await service.refresh('plaintext-refresh', req, res);

    expect(created).toHaveLength(1);
    // New refresh token expires at (approximately) the SAME absolute instant —
    // not Date.now() + 7 days.
    expect(
      Math.abs(created[0].expiresAt.getTime() - originalExpiresAt.getTime()),
    ).toBeLessThan(2000);

    // It is clearly far below the 7-day reset the old code applied.
    const remaining = created[0].expiresAt.getTime() - Date.now();
    expect(remaining).toBeLessThan(DAY); // < 24h, so definitely not a 7d reset
    expect(remaining).toBeGreaterThan(22 * 60 * 60 * 1000);

    // Cookie maxAge mirrors the remaining window, not 7 days.
    const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
    expect(refreshCookie?.opts.maxAge).toBeLessThan(DAY);
  });
});
