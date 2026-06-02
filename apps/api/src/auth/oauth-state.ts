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

/* ─── post-login `next` redirect (carried through the OAuth round-trip) ───
   The seller/admin apps bounce unauthenticated users to the web login with
   ?next=<their-url>. Email login honours it directly, but the OAuth callback
   used to hard-redirect to the homepage, so social login always dropped the
   user back on `/`. We stash a validated `next` in a short-lived cookie at the
   start route and consume it at the callback. */
export const OAUTH_NEXT_COOKIE = 'getx_oauth_next';

function trustedOrigins(config: ConfigService): string[] {
  const out: string[] = [];
  for (const key of ['WEB_URL', 'SELLER_URL', 'ADMIN_URL'] as const) {
    const raw = config.get<string>(key);
    if (!raw) continue;
    for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
      try {
        out.push(new URL(part).origin);
      } catch {
        /* skip malformed */
      }
    }
  }
  return out;
}

/** Open-redirect guard: only same-origin relative paths, our own app origins,
 *  or localhost are allowed as a post-login destination. */
export function safeOAuthNext(
  raw: unknown,
  config: ConfigService,
): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  // Relative path — but never protocol-relative ('//evil.com').
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return raw;
    if (trustedOrigins(config).includes(u.origin)) return raw;
  } catch {
    /* not a URL */
  }
  return null;
}

/** At the OAuth start route: stash the validated `next` in a cookie. */
export function issueOAuthNext(
  req: Request,
  res: Response,
  config: ConfigService,
): void {
  const next = safeOAuthNext(
    (req.query as Record<string, unknown> | undefined)?.next,
    config,
  );
  if (!next) return;
  res.cookie(OAUTH_NEXT_COOKIE, next, {
    ...cookieOptions(config),
    maxAge: STATE_TTL_MS,
  });
}

/** At the OAuth callback: read + clear the cookie and re-validate it. */
export function consumeOAuthNext(
  req: Request,
  res: Response,
  config: ConfigService,
): string | null {
  const cookies = req.cookies as Record<string, string> | undefined;
  const raw = cookies?.[OAUTH_NEXT_COOKIE];
  res.clearCookie(OAUTH_NEXT_COOKIE, cookieOptions(config));
  return safeOAuthNext(raw, config);
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
    const http = context.switchToHttp();
    issueOAuthNext(http.getRequest<Request>(), http.getResponse<Response>(), this.config);
    const res = http.getResponse<Response>();
    return { state: issueOAuthState(res, this.config) } as IAuthModuleOptions;
  }
}

@Injectable()
export class DiscordOAuthStartGuard extends AuthGuard('discord') {
  constructor(private readonly config: ConfigService) {
    super();
  }
  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const http = context.switchToHttp();
    issueOAuthNext(http.getRequest<Request>(), http.getResponse<Response>(), this.config);
    const res = http.getResponse<Response>();
    return { state: issueOAuthState(res, this.config) } as IAuthModuleOptions;
  }
}
