'use client';

import * as React from 'react';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/* GETX cookie consent — UK PECR + EU ePrivacy compliance.
 *
 * Behaviour:
 *   - First visit: banner shown at the bottom with Accept / Reject.
 *   - Choice is stored under `getx-cookie-consent` in localStorage
 *     (`accepted` | `rejected`). No backend call — pure client state.
 *   - `<Analytics />` + `<SpeedInsights />` only mount once consent is
 *     `accepted`; they're the only non-essential trackers we set, so
 *     gating them is enough to satisfy PECR for the UK soft-launch.
 *   - Essential auth cookies (accessToken / refreshToken set by the
 *     API) are exempt under PECR Reg 6(4)(b) — they're strictly
 *     necessary for the service the user requested.
 *
 * To revisit a previous decision, expose a "Cookie settings" link in
 * the landing footer that clears the localStorage key and reloads.
 */

const STORAGE_KEY = 'getx-cookie-consent';

type Consent = 'accepted' | 'rejected' | 'pending';

function readConsent(): Consent {
  if (typeof window === 'undefined') return 'pending';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') return stored;
    return 'pending';
  } catch {
    /* localStorage can throw in private mode / sandboxed iframes. */
    return 'pending';
  }
}

function writeConsent(value: Exclude<Consent, 'pending'>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* No-op — if storage is blocked, the user will see the banner
       again on next visit; that's the safe-default behaviour. */
  }
}

export function CookieConsent() {
  /* Server render returns null; the banner mounts on the client only
     after we read localStorage so there's no flash for returning users. */
  const [consent, setConsent] = React.useState<Consent>('pending');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setConsent(readConsent());
    setMounted(true);
  }, []);

  const accept = React.useCallback(() => {
    writeConsent('accepted');
    setConsent('accepted');
  }, []);

  const reject = React.useCallback(() => {
    writeConsent('rejected');
    setConsent('rejected');
  }, []);

  /* Mount tracking scripts only after the user has explicitly opted
     in. Rejection leaves them unmounted, and the SDK functions never
     run, so no analytics cookie is set. */
  const analyticsAllowed = mounted && consent === 'accepted';

  return (
    <>
      {analyticsAllowed && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}

      {mounted && consent === 'pending' && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[80] rounded-2xl bg-surface ring-1 ring-border shadow-2xl p-4 sm:p-5"
        >
          <h2 className="font-display text-[15px] font-bold mb-1.5">
            We use cookies
          </h2>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-3">
            Auth cookies are essential and always on. Analytics + Core Web
            Vitals from Vercel are off until you say yes.{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy policy
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={accept}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-[12.5px] font-bold hover:opacity-90 transition-opacity"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={reject}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-muted/30 hover:bg-muted/50 text-foreground text-[12.5px] font-semibold transition-colors"
            >
              Reject non-essential
            </button>
          </div>
        </div>
      )}
    </>
  );
}
