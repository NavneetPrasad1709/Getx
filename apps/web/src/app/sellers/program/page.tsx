'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Crown,
  Trophy,
  Star,
  ShieldCheck,
  ShoppingBag,
  MessageSquare,
  UserPlus,
  Heart,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

/* Public rank-ladder page — no auth gate.

   Mirrors the LADDER in apps/api/src/rank/rank.service.ts. Every tier
   surfaces its XP / orders / rating / KYC gates plus the tier-bonus
   loyalty points, then the perks block below explains the practical
   wins (cashback %, fee discount, priority dispute review, etc.). XP
   itself is explained in the bottom 4-card grid. */

interface Tier {
  rank: 'ROOKIE' | 'RISING' | 'TRUSTED' | 'PRO' | 'ELITE' | 'LEGEND';
  label: string;
  tagline: string;
  xp: number;
  orders: number;
  rating: number;
  needsKyc: boolean;
  bonusPoints: number;
  perks: string[];
  /* tone keys map to colour systems used throughout the app — keeps
     each rank visually distinct without inventing one-off hex codes. */
  tone:
    | 'gray'
    | 'cobalt'
    | 'green'
    | 'purple'
    | 'gold'
    | 'rainbow';
  icon: React.ComponentType<{ className?: string }>;
}

const TIERS: Tier[] = [
  {
    rank: 'ROOKIE',
    label: 'Rookie',
    tagline: 'Your starting line.',
    xp: 0,
    orders: 0,
    rating: 0,
    needsKyc: false,
    bonusPoints: 0,
    perks: [
      'Standard 5% seller fee',
      'Buyer protection on every order',
      'Standard support queue',
    ],
    tone: 'gray',
    icon: Star,
  },
  {
    rank: 'RISING',
    label: 'Rising',
    tagline: 'Verified and on the climb.',
    xp: 100,
    orders: 1,
    rating: 0,
    needsKyc: true,
    bonusPoints: 100,
    perks: [
      '1% cashback on every order',
      'Verified badge on your storefront',
      '+100 GETX Coins promotion bonus',
    ],
    tone: 'cobalt',
    icon: Sparkles,
  },
  {
    rank: 'TRUSTED',
    label: 'Trusted',
    tagline: 'A reliable name in the marketplace.',
    xp: 500,
    orders: 10,
    rating: 4.5,
    needsKyc: true,
    bonusPoints: 250,
    perks: [
      '1.5% cashback on every order',
      '0.5% seller-fee discount',
      'Trusted badge + priority listing review',
      '+250 GETX Coins promotion bonus',
    ],
    tone: 'green',
    icon: ShieldCheck,
  },
  {
    rank: 'PRO',
    label: 'Pro',
    tagline: 'Power seller. Power buyer.',
    xp: 2_000,
    orders: 50,
    rating: 4.7,
    needsKyc: true,
    bonusPoints: 500,
    perks: [
      '2% cashback on every order',
      '1% seller-fee discount',
      'Priority dispute review (24h SLA)',
      'Featured slot rotation in your category',
      '+500 GETX Coins promotion bonus',
    ],
    tone: 'purple',
    icon: Trophy,
  },
  {
    rank: 'ELITE',
    label: 'Elite',
    tagline: 'Top 1% of the platform.',
    xp: 10_000,
    orders: 200,
    rating: 4.85,
    needsKyc: true,
    bonusPoints: 1_000,
    perks: [
      '3% cashback on every order',
      '1.5% seller-fee discount',
      'Dedicated account manager',
      'Early access to new categories + features',
      '+1,000 GETX Coins promotion bonus',
    ],
    tone: 'gold',
    icon: Crown,
  },
  {
    rank: 'LEGEND',
    label: 'Legend',
    tagline: 'The ceiling. Custom everything.',
    xp: 50_000,
    orders: 1_000,
    rating: 4.9,
    needsKyc: false,
    bonusPoints: 2_500,
    perks: [
      '4% cashback on every order',
      '2% seller-fee discount',
      'Custom storefront URL + branded landing page',
      'White-glove dispute + payout handling',
      '+2,500 GETX Coins promotion bonus',
    ],
    tone: 'rainbow',
    icon: Crown,
  },
];

/* Tone helpers — kept inline so colour intent is obvious next to each
   rank, instead of buried in a Tailwind config. The "rainbow" tier uses
   a conic gradient on its accent surface. */
function chipFor(tone: Tier['tone']): string {
  switch (tone) {
    case 'gray':
      return 'bg-[hsl(var(--muted-foreground)/0.15)] text-[hsl(var(--muted-foreground))]';
    case 'cobalt':
      return 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]';
    case 'green':
      return 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]';
    case 'purple':
      return 'bg-[hsl(var(--accent)/0.18)] text-[hsl(var(--accent))]';
    case 'gold':
      return 'bg-[#FFCB05]/15 text-[#FFCB05]';
    case 'rainbow':
      return 'bg-[conic-gradient(from_0deg,#7C3AED,#06B6D4,#10B981,#FACC15,#EF4444,#7C3AED)]/20 text-white';
  }
}

function borderFor(tone: Tier['tone']): string {
  switch (tone) {
    case 'gray':
      return 'border-border/60';
    case 'cobalt':
      return 'border-[hsl(var(--primary)/0.4)]';
    case 'green':
      return 'border-[hsl(var(--success)/0.4)]';
    case 'purple':
      return 'border-[hsl(var(--accent)/0.4)]';
    case 'gold':
      return 'border-[#FFCB05]/45';
    case 'rainbow':
      return 'border-[#7C3AED]/45';
  }
}

const XP_RULES: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: ShoppingBag,
    title: 'Spend $1 = 10 XP',
    body: 'Capped at 1,000 XP per order. Counts for both buyer and seller side.',
  },
  {
    icon: MessageSquare,
    title: 'Leave a review = 100 XP',
    body: 'Verified reviews on completed orders only.',
  },
  {
    icon: UserPlus,
    title: 'Referral first-order = 500 XP',
    body: 'When a friend you referred completes their first order.',
  },
  {
    icon: Heart,
    title: '5★ review received = 50 XP',
    body: 'Sellers earn XP every time a buyer leaves them five stars.',
  },
];

export default function SellersProgramPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(var(--primary)/0.18),transparent_60%)]"
          />
          <div className="relative container max-w-5xl pt-28 pb-16 md:pt-32 md:pb-20 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] text-[11px] uppercase tracking-[0.18em] font-semibold mb-5">
              <Trophy className="h-3 w-3" />
              GETX Rank Program
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight">
              GETX Rank Ladder
            </h1>
            <p className="mt-4 text-[15px] md:text-[17px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every order earns XP. Climb six tiers from Rookie to Legend.
              Unlock perks — cashback, fee discounts, priority support,
              custom storefronts — at every step.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Link href="/profile/loyalty">
                <Button size="lg" className="rounded-full">
                  <Coins className="h-4 w-4" />
                  See your XP
                </Button>
              </Link>
              <Link href="/games">
                <Button size="lg" variant="outline" className="rounded-full">
                  Start earning
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Tier ladder */}
        <section className="container max-w-5xl py-16 md:py-20">
          <div className="mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              The six tiers
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground max-w-xl">
              Promotions are automatic — when you cross all four gates for
              the next tier, the system promotes you and credits a
              one-time bonus in GETX Coins.
            </p>
          </div>

          <ol className="grid lg:grid-cols-2 gap-4">
            {TIERS.map((tier, idx) => (
              <TierCard key={tier.rank} tier={tier} index={idx} />
            ))}
          </ol>
        </section>

        {/* XP explainer */}
        <section className="border-t border-border/40 bg-surface/40">
          <div className="container max-w-5xl py-16 md:py-20">
            <div className="mb-8">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                How XP works
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground max-w-xl">
                XP never decreases — once earned, it sticks. Promotions
                also require minimum orders, rating, and KYC where noted.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {XP_RULES.map((r) => (
                <div
                  key={r.title}
                  className="rounded-2xl bg-background border border-border/60 p-5"
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

            <div className="mt-10 text-center">
              <Link
                href="/profile/loyalty"
                className="inline-flex items-center gap-1 text-[14px] font-semibold text-[hsl(var(--primary))] hover:underline"
              >
                See your current XP and rewards
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const Icon = tier.icon;
  return (
    <li
      className={`relative rounded-3xl border bg-surface/60 p-6 md:p-7 ${borderFor(tier.tone)}`}
    >
      <div className="flex items-start gap-4 mb-5">
        <span
          className={`h-11 w-11 rounded-2xl grid place-items-center shrink-0 ${chipFor(tier.tone)}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              {tier.label}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.15em] ${chipFor(tier.tone)}`}
            >
              Tier {index + 1}
            </span>
          </div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5">
            {tier.tagline}
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <Req label="XP" value={tier.xp.toLocaleString()} />
        <Req
          label="Orders"
          value={tier.orders === 0 ? '—' : tier.orders.toLocaleString()}
        />
        <Req
          label="Rating"
          value={tier.rating === 0 ? '—' : `${tier.rating.toFixed(2)}★`}
        />
        <Req
          label="KYC"
          value={tier.needsKyc ? 'Verified' : 'Not required'}
        />
      </div>

      {tier.bonusPoints > 0 ? (
        <div className="rounded-xl bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] px-3 py-2 mb-4 flex items-center gap-2 text-[12.5px]">
          <Coins className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          <span className="text-foreground">
            <span className="font-bold tabular-nums">
              +{tier.bonusPoints.toLocaleString()}
            </span>{' '}
            GETX Coins on promotion
          </span>
        </div>
      ) : null}

      {/* Perks */}
      <ul className="space-y-1.5">
        {tier.perks.map((perk) => (
          <li
            key={perk}
            className="flex items-start gap-2 text-[13px] text-foreground/85"
          >
            <span className="mt-1.5 h-1 w-1 rounded-full bg-[hsl(var(--primary))] shrink-0" />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function Req({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[hsl(var(--surface))] border border-border/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="font-display text-[13px] font-extrabold tabular-nums">
        {value}
      </div>
    </div>
  );
}
