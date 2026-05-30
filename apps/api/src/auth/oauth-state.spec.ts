import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  OAUTH_STATE_COOKIE,
  issueOAuthState,
  verifyOAuthState,
} from './oauth-state';

// AUTH-001 — OAuth login-CSRF / session-fixation defence. These tests pin the
// contract the controller relies on: a callback is accepted only when the
// provider-echoed `state` matches the httpOnly cookie set at the start route.

const config = {
  get: (key: string) => (key === 'NODE_ENV' ? 'test' : undefined),
} as unknown as ConfigService;

function mockRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
}

function mockReq(cookieVal?: string, queryVal?: unknown): Request {
  return {
    cookies: cookieVal === undefined ? {} : { [OAUTH_STATE_COOKIE]: cookieVal },
    query: queryVal === undefined ? {} : { state: queryVal },
  } as unknown as Request;
}

describe('oauth-state', () => {
  describe('issueOAuthState', () => {
    it('sets an httpOnly, lax, scoped cookie and returns the nonce', () => {
      const res = mockRes();
      const nonce = issueOAuthState(res, config);

      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThanOrEqual(32);
      expect(res.cookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        nonce,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );
    });

    it('mints a fresh nonce each call', () => {
      expect(issueOAuthState(mockRes(), config)).not.toBe(
        issueOAuthState(mockRes(), config),
      );
    });
  });

  describe('verifyOAuthState', () => {
    it('accepts a matching state and burns the cookie', () => {
      const res = mockRes();
      const ok = verifyOAuthState(mockReq('nonce-123', 'nonce-123'), res, config);
      expect(ok).toBe(true);
      expect(res.clearCookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        expect.objectContaining({ path: '/api/v1/auth' }),
      );
    });

    it('rejects a mismatched state', () => {
      expect(
        verifyOAuthState(mockReq('nonce-123', 'attacker'), mockRes(), config),
      ).toBe(false);
    });

    it('rejects when the cookie is missing (forged / cross-browser callback)', () => {
      expect(
        verifyOAuthState(mockReq(undefined, 'nonce-123'), mockRes(), config),
      ).toBe(false);
    });

    it('rejects when the provider returned no state', () => {
      expect(
        verifyOAuthState(mockReq('nonce-123', undefined), mockRes(), config),
      ).toBe(false);
    });

    it('rejects differing-length values without throwing', () => {
      expect(verifyOAuthState(mockReq('abc', 'abcd'), mockRes(), config)).toBe(
        false,
      );
    });

    it('always clears the cookie, even on rejection (single-use)', () => {
      const res = mockRes();
      verifyOAuthState(mockReq('a', 'b'), res, config);
      expect(res.clearCookie).toHaveBeenCalledTimes(1);
    });
  });
});
