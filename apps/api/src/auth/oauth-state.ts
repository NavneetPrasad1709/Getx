import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard, type IAuthModuleOptions } from '@nestjs/passport';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

/* AUTH-001 — OAuth login-CSRF / session-fixation defence.

   The Google/Discord round-trip is bound to the initiating browser with a
   single-use `state` nonce: the START route sets an httpOnly cookie holding
   the nonce AND sends the same value to the provider as `?state=`. On the
   CALLBACK we require the value echoed back by the provider to equal the
   cookie. An attacker who forges a callback (or replays their own OAuth
   `code`) has no way to set the victim's httpOnly cookie, so the mismatch is
   rejected and the victim is never silently logged into the attacker's
   identity.

   Stateless by design — the cookie IS the store, so no server session /
   express-session dependency is required. Our passport strategies use the
   default NullStateStore (no `state`/`store` configured at construction), so
   passport itself neither stores nor verifies state; this module owns it. */

export const OAUTH_STATE_COOKIE = 'getx_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000; // a human finishes the consent screen well inside 10m

/* sameSite=lax is REQUIRED (not strict): the provider redirects the browser
   back to our callback as a top-level cross-site GET, and `strict` would
   withhold the cookie on that navigation, breaking every OAuth login. The
   nonce is not sensitive on its own, but httpOnly stops page JS from reading
   or forging it. */
function cookieOptions(config: ConfigService) {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const domain = config.get<string>('COOKIE_DOMAIN');
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    ...(domain ? { domain } : {}),
  };
}

/** Mint a fresh nonce, drop it as an httpOnly cookie, and return it so the
 *  caller can forward it to the provider as the `state` parameter. */
export function issueOAuthState(res: Response, config: ConfigService): string {
  const nonce = randomBytes(32).toString('base64url');
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    ...cookieOptions(config),
    maxAge: STATE_TTL_MS,
  });
  return nonce;
}

/** Constant-time compare of the echoed `state` against the cookie. Clears the
 *  cookie unconditionally so a captured nonce can never be replayed. */
export function verifyOAuthState(
  req: Request,
  res: Response,
  config: ConfigService,
): boolean {
  const cookies = req.cookies as Record<string, string> | undefined;
  const cookieState = cookies?.[OAUTH_STATE_COOKIE];
  const queryState =
    typeof req.query?.state === 'string' ? req.query.state : undefined;

  // Single-use: burn the nonce regardless of the outcome.
  res.clearCookie(OAUTH_STATE_COOKIE, cookieOptions(config));

  if (!cookieState || !queryState) return false;
  const a = Buffer.from(cookieState);
  const b = Buffer.from(queryState);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* Start-route guards. They extend the provider AuthGuard purely to hook
   getAuthenticateOptions(), where we set the state cookie and hand passport
   the matching `state` to embed in the authorization URL. The redirect to the
   provider is still performed by the base AuthGuard. */
@Injectable()
export class GoogleOAuthStartGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }
  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const res = context.switchToHttp().getResponse<Response>();
    return { state: issueOAuthState(res, this.config) } as IAuthModuleOptions;
  }
}

@Injectable()
export class DiscordOAuthStartGuard extends AuthGuard('discord') {
  constructor(private readonly config: ConfigService) {
    super();
  }
  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const res = context.switchToHttp().getResponse<Response>();
    return { state: issueOAuthState(res, this.config) } as IAuthModuleOptions;
  }
}
