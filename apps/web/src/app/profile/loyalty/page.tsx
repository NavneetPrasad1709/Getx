'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ArrowDown,
  Clock,
  Wrench,
  Coins,
  ShoppingBag,
  Star,
  Gift,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';
import {
  useLoyalty,
  type LoyaltyTxn,
  type LoyaltyTxnType,
} from '@/hooks/use-loyalty';
import { formatMoney } from '@/lib/currency';

/* GETX Coins dashboard — buyer-facing.

   Mirrors /profile/wallet/page.tsx visually: breadcrumb + h1 + lead, a
   cobalt-tinted balance hero, an earn-rules grid, then a tabbed ledger
   (All / Earned / Spent / Expired). 1 point = $0.01, capped at 50% of
   any checkout, and points expire 12 months after they're earned. */

type Tab = 'all' | 'earned' | 'spent' | 'expired';

const EARNED_TYPES: LoyaltyTxnType[] = [
  'EARNED_PURCHASE',
  'EARNED_REFERRAL',
  'EARNED_REVIEW',
  'EARNED_TIER_BONUS',
  'EARNED_FIRST_LISTING',
  'EARNED_PROFILE_COMPLETE',
];

function isEarned(t: LoyaltyTxnType): boolean {
  return EARNED_TYPES.includes(t);
}

function iconFor(t: LoyaltyTxnType): React.ComponentType<{ className?: string }> {
  if (t === 'REDEEMED_AT_CHECKOUT') return ArrowDown;
  if (t === 'EXPIRED') return Clock;
  if (t === 'ADJUSTMENT') return Wrench;
  return ArrowUp;
}

function filterByTab(rows: LoyaltyTxn[], tab: Tab): LoyaltyTxn[] {
  if (tab === 'all') return rows;
  if (tab === 'earned') return rows.filter((r) => isEarned(r.type));
  if (tab === 'spent')
    return rows.filter(
      (r) => r.type === 'REDEEMED_AT_CHECKOUT' || r.type === 'ADJUSTMENT',
    );
  return rows.filter((r) => r.type === 'EXPIRED');
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatExpiryShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function LoyaltyPage() {
  const { isAuthenticated, loading } = useAuth();
  const { data, isLoading } = useLoyalty(isAuthenticated);
  const [tab, setTab] = React.useState<Tab>('all');

  React.useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.assign(
        '/auth/login?next=' + encodeURIComponent('/profile/loyalty'),
      );
    }
  }, [loading, isAuthenticated]);

  const balance = data?.balance ?? 0;
  const lifetime = data?.lifetime ?? 0;
  const nextExpiry = data?.nextExpiry ?? null;
  const ledger = data?.ledger ?? [];
  const filtered = filterByTab(ledger, tab);
  const dollarValue = balance * 0.01;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-3xl pt-24 pb-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <Link href="/profile" className="hover:text-foreground">
            Profile
          </Link>
          <span aria-hidden className="mx-2">·</span>
          <span className="text-foreground">Loyalty</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          GETX Coins
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-xl">
          Earn points on every order. 1 point = $0.01. Apply up to 50% of any
          checkout. Points expire 12 months after earn.
        </p>

        {/* Balance hero */}
        <section className="mt-6 rounded-3xl border border-[hsl(var(--primary)/0.3)] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08)_0%,hsl(var(--primary)/0.02)_100%)] p-6 md:p-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 inline-flex items-center gap-1.5">
            <Coins className="h-3 w-3 text-[hsl(var(--primary))]" />
            Current balance
          </div>
          {isLoading ? (
            <Skeleton className="h-12 w-48" />
          ) : (
            <div className="font-display text-5xl md:text-6xl font-extrabold tabular-nums text-[hsl(var(--foreground))] leading-none">
              {balance.toLocaleString()}{' '}
              <span className="text-2xl md:text-3xl text-muted-foreground font-bold">
                pts
              </span>
            </div>
          )}
          <div className="mt-3 text-[13px] text-muted-foreground">
            ≈ {formatMoney(dollarValue, 'USD')} value at checkout
          </div>

          {/* Stats row */}
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <HeroStat
              label="Lifetime earned"
              value={
                isLoading ? null : `${lifetime.toLocaleString()} pts`
              }
            />
            <HeroStat
              label="Next expiry"
              value={
                isLoading
                  ? null
                  : nextExpiry
                    ? `${nextExpiry.points.toLocaleString()} pts on ${formatExpiryShort(nextExpiry.expiresAt)}`
                    : 'No upcoming expiry'
              }
            />
            <HeroStat label="Earn rate" value="1 pt per $1" />
          </div>

          <div className="mt-6 rounded-2xl bg-[hsl(var(--surface))] border border-border/40 px-4 py-3 flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-[hsl(var(--primary)/0.12)] grid place-items-center shrink-0">
              <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
            </span>
            <div className="text-[12.5px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                Want to earn faster?
              </span>{' '}
              Climb the rank ladder for tier bonuses.{' '}
              <Link
                href="/sellers/program"
                className="text-[hsl(var(--primary))] font-semibold hover:underline"
              >
                How to earn →
              </Link>
            </div>
          </div>
        </section>

        {/* Earn rules */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-extrabold mb-3">
            Ways to earn
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {EARN_RULES.map((r) => (
              <div
                key={r.title}
                className="rounded-2xl bg-surface border border-border/60 p-5"
              >
                <span className="h-10 w-10 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] grid place-items-center mb-3">
                  <r.icon className="h-4 w-4" />
                </span>
                <div className="font-display text-[14px] font-extrabold leading-tight mb-1">
                  {r.title}
                </div>
                <div className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {r.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div className="mt-10 flex items-center gap-1 border-b border-border/40 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'earned', label: 'Earned' },
              { key: 'spent', label: 'Spent' },
              { key: 'expired', label: 'Expired' },
            ] as Array<{ key: Tab; label: string }>
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                tab === t.key
                  ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Ledger */}
        <section className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-surface/40 p-10 text-center text-sm text-muted-foreground">
              {ledger.length === 0
                ? 'No points yet. Place your first order to start earning.'
                : 'No transactions yet in this view.'}
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((row) => (
                <LedgerRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-[hsl(var(--surface))] border border-border/50 px-4 py-3">
      <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      {value === null ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <div className="font-display text-[14px] font-extrabold tabular-nums">
          {value}
        </div>
      )}
    </div>
  );
}

const EARN_RULES: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: ShoppingBag,
    title: 'Complete an order',
    body: '1 pt per $1 spent. Capped at 1,000 pts per order.',
  },
  {
    icon: Star,
    title: 'Write a review',
    body: '50 pts per verified review on a completed order.',
  },
  {
    icon: Gift,
    title: 'Refer a friend',
    body: '500 pts when their first order completes.',
  },
  {
    icon: CheckCircle2,
    title: 'Complete your profile',
    body: '100 pts one-time bonus when your profile is full.',
  },
];

function LedgerRow({ row }: { row: LoyaltyTxn }) {
  const Icon = iconFor(row.type);
  const earned = isEarned(row.type);
  const expired = row.type === 'EXPIRED';
  const redeemed = row.type === 'REDEEMED_AT_CHECKOUT';

  const iconCls = earned
    ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
    : expired
      ? 'bg-[hsl(var(--error)/0.15)] text-[hsl(var(--error))]'
      : 'bg-[hsl(var(--muted-foreground)/0.15)] text-[hsl(var(--muted-foreground))]';

  const amountCls = earned
    ? 'text-[hsl(var(--success))]'
    : expired
      ? 'text-[hsl(var(--error))]'
      : 'text-muted-foreground';

  const sign = earned ? '+' : row.points < 0 ? '' : redeemed ? '-' : '';
  const displayPts = Math.abs(row.points).toLocaleString();

  return (
    <li className="py-4 flex items-center gap-4">
      <span
        className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${iconCls}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-foreground truncate">
          {row.description}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="tabular-nums">{formatRelative(row.createdAt)}</span>
          {row.orderId ? (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/orders/${row.orderId}`}
                className="text-[hsl(var(--primary))] hover:underline"
              >
                View order
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className={`font-display text-[15px] font-extrabold tabular-nums ${amountCls}`}
        >
          {sign}
          {displayPts} pts
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">
          Bal {row.balanceAfter.toLocaleString()}
        </div>
      </div>
    </li>
  );
}
