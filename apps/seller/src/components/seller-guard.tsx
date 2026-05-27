'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

/* Inline spinner — seller app doesn't ship lucide-react. */
function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* SellerGuard

   The seller app intentionally has no `/auth/*` routes — auth lives on
   the web app. The API sets its session cookie on the API origin, and
   both frontends include credentials when they call the API, so a
   successful login on the web app gives the seller app session access
   too. When an unauthenticated request hits a seller route, bounce the
   browser to the web app's login page and pass back the absolute URL
   the user was trying to reach so login can return them cleanly. */

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
const SELLER_URL = process.env.NEXT_PUBLIC_SELLER_URL ?? 'http://localhost:3001';

export function SellerGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    if (typeof window === 'undefined') return;

    const returnTo = `${SELLER_URL}${pathname}`;
    const loginUrl = `${WEB_URL}/auth/login?next=${encodeURIComponent(returnTo)}`;
    window.location.replace(loginUrl);
  }, [isAuthenticated, loading, pathname]);

  if (loading) {
    return (
      <GuardScreen
        label="Checking your session"
        sublabel="One moment — verifying with the GETX session service."
      />
    );
  }
  if (!isAuthenticated) {
    return (
      <GuardScreen
        label="Redirecting to sign in"
        sublabel="Taking you to GETX so you can authorise the seller dashboard."
      />
    );
  }

  /* Authenticated but not yet a seller — every seller-app surface
     assumes user.isSeller, so a buyer who lands on a deep link
     (sell.getx.live/listings, /orders, etc) would see empty data and
     a confusing dashboard. Render a single CTA that activates the
     seller flag via the existing /auth/me/activate-seller endpoint
     before the page mounts. */
  if (!user?.isSeller) {
    return <NotASellerScreen />;
  }

  return <>{children}</>;
}

/* Single-step "become a seller" CTA. Hits the activate-seller endpoint
   then forces a /auth/me refetch so isSeller flips true and the page
   re-renders the real seller UI. Activation is idempotent server-side
   (PATCH /auth/me/activate-seller). */
function NotASellerScreen() {
  const { refetch } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onActivate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
      const res = await fetch(`${apiUrl}/auth/me/activate-seller`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Activate failed (${res.status})`);
      await refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Activation failed');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-5">
          <Spinner className={busy ? 'h-5 w-5 animate-spin' : 'hidden'} />
          <svg className={busy ? 'hidden' : 'h-5 w-5'} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2">
          Activate your seller dashboard
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          You&apos;re signed in as a buyer. Activating opens the seller dashboard
          so you can list accounts, top-ups, and services on GETX.
        </p>
        {err ? <p className="text-sm text-red-500 mb-4">{err}</p> : null}
        <button
          type="button"
          onClick={onActivate}
          disabled={busy}
          className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Activating…' : 'Become a seller'}
        </button>
      </div>
    </div>
  );
}

/* Branded full-screen loading panel used during the auth probe and the
   cross-origin redirect window. Replaces the previous bare
   `<div className="min-h-screen" />` which looked like a broken page. */
function GuardScreen({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-5">
          <Spinner className="h-5 w-5 animate-spin" />
        </div>
        <div className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2">
          {label}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{sublabel}</p>
      </div>
    </div>
  );
}
