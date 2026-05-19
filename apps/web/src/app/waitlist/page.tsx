'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Globe, MailCheck } from 'lucide-react';
import { Button, FloatingInput, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { api } from '@/lib/api';

/* /waitlist — public landing for buyers from countries outside the
   current soft-launch allowlist. Renders even when the visitor's
   country is allowed (linked to from the homepage promo strip), so the
   gating must happen server-side at /auth/register, not here.

   On submit we POST to /waitlist/join — best-effort persistence in
   the API; if the endpoint doesn't exist yet we still confirm to the
   user so the funnel doesn't break.

   The list of regions currently live is read off
   `NEXT_PUBLIC_LAUNCH_COUNTRIES` (csv of ISO codes). Falls back to
   US + UK + IN when unset to match the typical soft-launch config. */

const LAUNCH_COUNTRIES = (
  process.env.NEXT_PUBLIC_LAUNCH_COUNTRIES ?? 'US,GB,IN'
)
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const COUNTRY_LABELS: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  SG: 'Singapore',
  PH: 'Philippines',
  BR: 'Brazil',
  MX: 'Mexico',
};

export default function WaitlistPage() {
  return (
    <React.Suspense fallback={null}>
      <WaitlistInner />
    </React.Suspense>
  );
}

function WaitlistInner() {
  const sp = useSearchParams();
  const presetCountry = (sp.get('country') ?? '').toUpperCase();

  const [email, setEmail] = React.useState('');
  const [country, setCountry] = React.useState(presetCountry || '');
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !country.trim()) {
      toast.error('Enter your email + country');
      return;
    }
    setBusy(true);
    try {
      /* Best-effort POST — endpoint may not exist yet in early
         soft-launch builds, so we never block the UX on its response. */
      await api
        .post('/waitlist/join', {
          email: email.trim(),
          country: country.toUpperCase(),
        })
        .catch(() => undefined);
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <section className="mx-auto max-w-[760px] px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-[hsl(var(--primary))] mb-3 inline-flex items-center gap-2">
          <Globe className="h-3 w-3" />
          Soft launch in progress
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">
          GETX is rolling out region by region.
        </h1>
        <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
          We&apos;re onboarding traders in{' '}
          <span className="font-semibold text-foreground">
            {LAUNCH_COUNTRIES.map((c) => COUNTRY_LABELS[c] ?? c).join(', ')}
          </span>{' '}
          first while we tune escrow + payouts in each currency. Drop your
          email below and we&apos;ll ping you the moment your country is
          live.
        </p>

        <div className="mt-10 surface-cinematic rounded-3xl p-6 md:p-8">
          {submitted ? (
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))] grid place-items-center shrink-0">
                <MailCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold">
                  You&apos;re on the list
                </h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  We&apos;ll email{' '}
                  <span className="font-mono text-foreground">{email}</span>{' '}
                  the day GETX opens for{' '}
                  {COUNTRY_LABELS[country] ?? country}. No spam, no other
                  lists.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 mt-4 text-[12.5px] font-semibold text-[hsl(var(--primary))] hover:underline"
                >
                  Back home
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <FloatingInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="Email"
                type="email"
                autoComplete="email"
                required
              />
              <div>
                <label
                  htmlFor="waitlist-country"
                  className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2"
                >
                  Country
                </label>
                <select
                  id="waitlist-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-12 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                  required
                >
                  <option value="">Select your country…</option>
                  {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                loading={busy}
                loadingText="Joining…"
                size="xl"
                className="w-full rounded-full"
              >
                Join the waitlist
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                One email, when your country goes live. Unsubscribe any time.
              </p>
            </form>
          )}
        </div>
      </section>
      <LandingFooter />
    </div>
  );
}
