import type { ConfigService } from '@nestjs/config';

/* Returns the FIRST origin from a comma-separated env value like
   WEB_URL. The full list is the CORS allowlist (see main.ts); but
   when we need to construct a URL to embed in an email or redirect
   to, we can only use one — pick the canonical (first) entry.

   Without this helper, callers that did
     `${config.get('WEB_URL')}/auth/reset-password`
   produced comma-poisoned URLs the moment WEB_URL went multi-origin,
   e.g. `https://www.getx.live,https://getx.live,https://getx-web.
   vercel.app/auth/reset-password?token=…`. Browsers refuse to load
   that, password reset emails would silently 404 the user. */
export function firstOrigin(
  config: ConfigService,
  key: 'WEB_URL' | 'SELLER_URL' | 'ADMIN_URL',
  fallback: string,
): string {
  return firstOriginFromCsv(config.get<string>(key), fallback);
}

/* process.env variant for module-load-time use (decorator metadata, etc.)
   where ConfigService isn't available yet. */
export function firstOriginFromCsv(
  raw: string | undefined,
  fallback: string,
): string {
  const first = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  return first ?? fallback;
}

/* Expands a CSV env value into the flat list of trimmed origins. Used by
   CORS allowlists that need each origin separately. */
export function parseOriginList(
  raw: string | undefined,
  fallback: string,
): string[] {
  const parts = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [fallback];
}
