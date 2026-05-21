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
  const raw = config.get<string>(key) ?? '';
  const first = raw
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  return first ?? fallback;
}
