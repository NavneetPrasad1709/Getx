import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { firstOrigin } from '../../common/config-helpers';

/* Reduces the noisy passport error shape to one of three SPA codes.
   `oauth_cancelled` is the explicit user-rejected-consent case;
   `oauth_no_email` covers profiles that came back without an email
   (rare, mostly Discord users with privacy locks); anything else
   collapses to `oauth_failed` so we don't accidentally advertise that
   a provider's API is down or that we routed through a specific token
   endpoint. */
function classifyError(err: unknown, info: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  const infoMsg = (info instanceof Error ? info.message : String(info ?? '')).toLowerCase();
  const combined = `${msg} ${infoMsg}`;
  if (
    combined.includes('access_denied') ||
    combined.includes('user denied') ||
    combined.includes('cancel')
  ) {
    return 'oauth_cancelled';
  }
  if (combined.includes('no email')) return 'oauth_no_email';
  return 'oauth_failed';
}

/* Stamp the request with an oauthError sentinel and return a non-false
   stub so the canActivate path succeeds — the controller handler then
   inspects req.user.oauthError and decides to redirect instead of
   continuing the OAuth flow. Default AuthGuard would 500 the response
   here and leave the browser stuck on the provider callback URL. */
function handleOAuthFailure(
  err: unknown,
  user: unknown,
  info: unknown,
  context: ExecutionContext,
): unknown {
  if (err || !user) {
    const req = context.switchToHttp().getRequest<{ oauthError?: string }>();
    const code = classifyError(err, info);
    req.oauthError = code;
    return { oauthError: code };
  }
  return user;
}

/* Google callback guard — passport-google-oauth20 strategy name. */
@Injectable()
export class GoogleOAuthRedirectGuard extends AuthGuard('google') {
  handleRequest<T = unknown>(
    err: unknown,
    user: T | false,
    info: unknown,
    context: ExecutionContext,
  ): T {
    return handleOAuthFailure(err, user, info, context) as T;
  }
}

/* Discord callback guard — passport-discord strategy name. */
@Injectable()
export class DiscordOAuthRedirectGuard extends AuthGuard('discord') {
  handleRequest<T = unknown>(
    err: unknown,
    user: T | false,
    info: unknown,
    context: ExecutionContext,
  ): T {
    return handleOAuthFailure(err, user, info, context) as T;
  }
}

/* Shared helper used by both callback handlers — turns an error code
   into a Response.redirect pointing at the SPA's login page with the
   right query param. Centralised here so the controller doesn't need
   to know the WEB_URL parsing contract or the query-param shape. */
@Injectable()
export class OAuthFailureRedirector {
  constructor(private readonly config: ConfigService) {}

  redirect(res: Response, code: string): void {
    const webUrl = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');
    res.redirect(`${webUrl}/auth/login?error=${encodeURIComponent(code)}`);
  }
}
