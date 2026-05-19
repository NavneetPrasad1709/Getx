'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Gift,
  Share2,
  Wallet,
  Copy,
  Check,
  Trophy,
} from 'lucide-react';
import { Button, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';
import { useMyReferrals, useReferralLeaderboard } from '@/hooks/use-referrals';
import { formatMoney } from '@/lib/currency';

/* Referrals dashboard — buyer-facing.

   Surfaces the user's referral code (deterministic per-user, derived
   server-side from their handle), a shareable link, lifetime stats, and
   the leaderboard. Real attribution tracking (Referral model + signup
   funnel) lands in the next schema push; for now the leaderboard reads
   from existing WalletTransaction.REFERRAL rows. */

export default function ReferralsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { data: mine, isLoading } = useMyReferrals(isAuthenticated);
  const { data: board } = useReferralLeaderboard();
  const [copied, setCopied] = React.useState<'code' | 'link' | null>(null);

  React.useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.assign(
        '/auth/login?next=' + encodeURIComponent('/profile/referrals'),
      );
    }
  }, [loading, isAuthenticated]);

  const code = mine?.code ?? '';
  const shareUrl = `https://getx.gg/r/${code}`;

  const copy = async (what: 'code' | 'link') => {
    const value = what === 'code' ? code : shareUrl;
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error('Clipboard blocked — copy manually');
    }
  };

  const shareNative = async () => {
    if (typeof navigator === 'undefined') return;
    if ('share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: 'Join GETX with my code',
          text: `Use ${code} to get $5 off your first GETX order.`,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void copy('link');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-4xl pt-24 pb-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <Link href="/profile" className="hover:text-foreground">Profile</Link>
          <span aria-hidden className="mx-2">·</span>
          <span className="text-foreground">Referrals</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Refer &amp; earn
        </h1>
        <p className="text-[14px] text-muted-foreground max-w-xl mb-8">
          Share your link. Friend places their first order. Both wallets get
          $5 credit within 24 hours. No cap, no expiry.
        </p>

        {/* Hero card */}
        <section className="rounded-3xl border border-[hsl(var(--primary)/0.3)] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08)_0%,hsl(var(--primary)/0.02)_100%)] p-6 md:p-8 mb-8">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <Gift className="h-3 w-3 text-[hsl(var(--primary))]" />
                Your code
              </div>
              {isLoading ? (
                <Skeleton className="h-12 w-48" />
              ) : (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-display font-extrabold tabular-nums text-3xl md:text-4xl text-[hsl(var(--foreground))]">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy('code')}
                    aria-label="Copy code"
                    className="inline-flex h-8 items-center gap-1 px-3 rounded-full bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-[12px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--surface-elevated))]"
                  >
                    {copied === 'code' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy code
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="mt-3 text-[12.5px] text-muted-foreground break-all">
                {shareUrl}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={shareNative} className="rounded-full">
                  <Share2 className="h-4 w-4" />
                  Share link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copy('link')}
                  className="rounded-full"
                >
                  {copied === 'link' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy link
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              <Stat label="Earned" value={mine ? formatMoney(mine.lifetimeEarned, 'USD') : '—'} />
              <Stat label="Rewarded" value={mine ? String(mine.rewardedCount) : '—'} />
              <Stat label="Pending" value={mine ? String(mine.pendingCount) : '—'} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl bg-surface border border-border/60 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="h-9 w-9 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] grid place-items-center">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="font-display text-base font-extrabold text-muted-foreground/40 tabular-nums">
                  0{i + 1}
                </span>
              </div>
              <div className="font-display text-[14px] font-extrabold leading-tight mb-1">
                {s.title}
              </div>
              <div className="text-[12px] text-muted-foreground leading-relaxed">
                {s.body}
              </div>
            </div>
          ))}
        </section>

        {/* Recent rewards */}
        <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 mb-8">
          <h2 className="font-display text-lg font-extrabold mb-3 inline-flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[hsl(var(--primary))]" />
            Recent rewards
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : !mine || mine.rewards.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              No referral rewards yet. Share your code to start earning.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {mine.rewards.map((r) => (
                <li key={r.id} className="py-3 flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] grid place-items-center">
                    <Gift className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">
                      {r.description}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="font-display font-extrabold tabular-nums text-[14px] text-[hsl(var(--success))]">
                    +{formatMoney(r.amount, r.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Leaderboard */}
        <section className="rounded-3xl border border-border/60 bg-surface/60 p-6">
          <h2 className="font-display text-lg font-extrabold mb-3 inline-flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#FFCB05]" />
            Top earners
          </h2>
          {!board ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : (
            <ol className="space-y-2.5">
              {board.slice(0, 10).map((row) => (
                <li
                  key={row.rank}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span className="font-display font-extrabold text-[hsl(var(--primary))] tabular-nums w-5 shrink-0">
                      {row.rank}
                    </span>
                    <span className="text-foreground truncate">
                      @{row.username}
                    </span>
                  </span>
                  <span className="font-display font-extrabold tabular-nums">
                    {formatMoney(row.earned, 'USD')}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

const STEPS = [
  {
    icon: Share2,
    title: 'Share your link',
    body: 'Discord / Twitter / IRL — they tap, they sign up.',
  },
  {
    icon: Wallet,
    title: 'They place a first order',
    body: 'Any drop, any category — once payment confirms.',
  },
  {
    icon: Gift,
    title: 'Both get $5',
    body: 'Credited to your GETX wallet within 24 hours.',
  },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[hsl(var(--surface))] border border-border/50 p-3 text-center">
      <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className="font-display text-base font-extrabold tabular-nums">
        {value}
      </div>
    </div>
  );
}
