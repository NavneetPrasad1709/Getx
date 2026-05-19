'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Flame,
  Clock,
  ArrowRight,
  Star,
  BadgeCheck,
  User,
  Coins,
  Package,
  Sword,
} from 'lucide-react';
import { RefundSlaChip } from '@/components/shield/refund-sla-chip';
import { formatMoney } from '@/lib/currency';

/* HotDeals — "Lightning Deals" rail with live HH:MM:SS countdowns.

   Mounted between RecentlyViewed and PopularAccounts on the homepage.
   Each card shows discount %, original/sale price, red countdown chip,
   stock-left bar, seller mini-bar, and a "Grab now" CTA. Cards auto-hide
   when their endsAt passes. A single 1Hz interval drives every countdown. */

const EASE = [0.22, 1, 0.36, 1] as const;

type DealCategory = 'Accounts' | 'Top-ups' | 'Items' | 'Boosting';

interface Deal {
  id: string;
  href: string;
  title: string;
  category: DealCategory;
  /* deterministic gradient seed */
  slug: string;
  accent: string;
  price: number;
  originalPrice: number;
  /* ISO timestamp — card hides itself once now >= endsAt */
  endsAt: string;
  stockLeft: number;
  stockTotal: number;
  seller: {
    handle: string;
    rating: number;
    orders: number;
    verified: boolean;
  };
}

const CATEGORY_ICON: Record<DealCategory, React.ComponentType<{ className?: string }>> = {
  Accounts: User,
  'Top-ups': Coins,
  Items: Package,
  Boosting: Sword,
};

/* Resolve deal endsAt deterministically at module load so server + client
   markup line up. Each value is "now + X hours" computed once. */
const baseStart = Date.now();
const hours = (h: number) => new Date(baseStart + h * 60 * 60 * 1000).toISOString();

const DEALS: Deal[] = [
  {
    id: 'd1',
    href: '/games/pokemon-go/accounts/v50-hundo-mewtwo',
    title: 'Lv 50 Valor · 6× Hundo · 18 Legendaries',
    category: 'Accounts',
    slug: 'lv50-hundo-valor',
    accent: '#0038ff',
    price: 399,
    originalPrice: 531,
    endsAt: hours(3.2),
    stockLeft: 1,
    stockTotal: 1,
    seller: { handle: '@rohan_t', rating: 4.98, orders: 412, verified: true },
  },
  {
    id: 'd2',
    href: '/games/pokemon-go/top-ups/pokecoins-14500',
    title: '14,500 PokéCoins · Auto delivery in 8 min',
    category: 'Top-ups',
    slug: 'pokecoins-14500',
    accent: 'hsl(var(--primary))',
    price: 50,
    originalPrice: 62,
    endsAt: hours(11),
    stockLeft: 4,
    stockTotal: 10,
    seller: { handle: '@MysticPriya', rating: 4.97, orders: 240, verified: true },
  },
  {
    id: 'd3',
    href: '/games/pokemon-go/boosting/master-league-rank',
    title: 'Master League Rank Push · 2800+ ELO',
    category: 'Boosting',
    slug: 'master-league-push',
    accent: '#7C3AED',
    price: 40,
    originalPrice: 52,
    endsAt: hours(20),
    stockLeft: 3,
    stockTotal: 5,
    seller: { handle: '@InstinctKaran', rating: 4.95, orders: 186, verified: true },
  },
  {
    id: 'd4',
    href: '/games/pokemon-go/items/raid-passes-30',
    title: '30× Remote Raid Pass Bundle · Code drop',
    category: 'Items',
    slug: 'raid-pass-bundle-30',
    accent: '#10B981',
    price: 15,
    originalPrice: 20,
    endsAt: hours(7),
    stockLeft: 12,
    stockTotal: 25,
    seller: { handle: '@arjun_pogo', rating: 4.94, orders: 308, verified: true },
  },
];

function angleFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return '00:00:00';
  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function HotDeals() {
  const reduce = useReducedMotion();
  /* Mounted gate — renders skeleton on first paint to keep SSR/CSR identical
     and avoid hydration mismatch on the countdown numbers. */
  const [mounted, setMounted] = React.useState(false);
  const [now, setNow] = React.useState(() => baseStart);

  React.useEffect(() => {
    setMounted(true);
    /* Single shared 1Hz ticker drives every card. */
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* Filter out expired deals — auto-hides cards as countdowns hit zero. */
  const liveDeals = DEALS.filter((d) => new Date(d.endsAt).getTime() > now);

  /* Section header headline derives from the soonest endsAt. */
  const soonestMs = liveDeals.reduce(
    (min, d) => Math.min(min, new Date(d.endsAt).getTime() - now),
    Number.POSITIVE_INFINITY,
  );
  const soonestHours = Number.isFinite(soonestMs)
    ? Math.max(1, Math.ceil(soonestMs / (60 * 60 * 1000)))
    : 0;

  if (mounted && liveDeals.length === 0) return null;

  return (
    <section
      aria-label="Lightning deals"
      className="relative bg-[#0F0C26] text-white px-4 sm:px-6 lg:px-8 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-4 flex-wrap mb-8 md:mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] ring-1 ring-[hsl(var(--primary)/0.3)] rounded-full px-3 py-1.5">
              <Flame className={`h-3 w-3 ${reduce ? '' : 'animate-pulse'}`} />
              Lightning deals
            </div>
            <h2 className="font-display font-extrabold leading-[0.95] tracking-[-0.02em] text-[clamp(1.75rem,5vw,3.25rem)] text-white">
              {mounted && soonestHours > 0
                ? `Drops ending in ${soonestHours}h`
                : 'Live price drops'}
            </h2>
            <p className="mt-2 text-[14px] text-white/65 max-w-xl">
              Verified-seller drops, escrow-protected, ending fast. Refresh in 24 hrs.
            </p>
          </div>
          <Link
            href="/games/pokemon-go/accounts?sort=price-asc"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white/[0.06] ring-1 ring-white/15 text-[13px] font-semibold text-white hover:bg-white/[0.1] transition-colors"
          >
            All deals
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {!mounted
            ? Array.from({ length: 3 }).map((_, i) => <DealSkeleton key={i} />)
            : liveDeals.slice(0, 3).map((deal, i) => (
                <motion.div
                  key={deal.id}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
                >
                  <DealCard deal={deal} now={now} />
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}

function DealCard({ deal, now }: { deal: Deal; now: number }) {
  const endsAtMs = new Date(deal.endsAt).getTime();
  const msLeft = Math.max(0, endsAtMs - now);
  const countdown = formatCountdown(msLeft);

  const Icon = CATEGORY_ICON[deal.category];
  const angle = angleFromSlug(deal.slug);
  const saved = deal.originalPrice - deal.price;
  const discountPct = Math.round((saved / deal.originalPrice) * 100);
  const stockPct = Math.max(0, Math.min(100, (deal.stockLeft / deal.stockTotal) * 100));
  const initials = deal.seller.handle.replace('@', '').slice(0, 2).toUpperCase();

  return (
    <Link
      href={deal.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-[hsl(var(--primary)/0.5)] hover:-translate-y-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
    >
      {/* Image area — themed gradient + Pokéball backdrop + category glyph */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${angle}deg, ${deal.accent} 0%, ${deal.accent}99 35%, ${deal.accent}33 100%)`,
          }}
        />
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full opacity-[0.18]"
          aria-hidden
        >
          <g fill="none" stroke="#FFFFFF" strokeWidth="2.5">
            <circle cx="100" cy="100" r="74" />
            <path d="M26 100 H174" />
            <circle cx="100" cy="100" r="14" />
          </g>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <Icon className="h-12 w-12 text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" />
        </div>

        {/* Discount chip */}
        <div className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-[#FF3B30] text-white text-[11px] font-extrabold tabular-nums shadow-[0_4px_12px_rgba(255,59,48,0.4)]">
          −{discountPct}%
        </div>

        {/* Category chip */}
        <div className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm text-white text-[10.5px] font-semibold uppercase tracking-wider">
          {deal.category}
        </div>

        {/* Countdown chip — bottom-left overlay */}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FF3B30] text-white text-[11.5px] font-mono font-bold tabular-nums shadow-[0_4px_12px_rgba(255,59,48,0.4)]">
          <Clock className="h-3 w-3" />
          {countdown}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 md:p-5 flex flex-col">
        <h3 className="font-display text-[15.5px] md:text-base font-extrabold tracking-tight text-white leading-snug line-clamp-2 mb-3 min-h-[2.6em]">
          {deal.title}
        </h3>

        {/* Stock bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/60 mb-1.5">
            <span>{deal.stockLeft} of {deal.stockTotal} left</span>
            {deal.stockLeft <= 3 ? (
              <span className="text-[hsl(var(--primary))]">Almost gone</span>
            ) : null}
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--primary))] rounded-full transition-[width] duration-500"
              style={{ width: `${stockPct}%` }}
            />
          </div>
        </div>

        {/* Trust chip */}
        <div className="mb-3">
          <RefundSlaChip variant="compact" category={deal.category} />
        </div>

        {/* Seller mini-bar */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="h-7 w-7 rounded-full grid place-items-center text-white text-[10px] font-bold shrink-0"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
            }}
            aria-hidden
          >
            {initials}
          </span>
          <span className="text-[12.5px] font-semibold text-white truncate">
            {deal.seller.handle}
          </span>
          {deal.seller.verified ? (
            <BadgeCheck className="h-3.5 w-3.5 text-[hsl(var(--primary))] shrink-0" />
          ) : null}
          <span className="inline-flex items-center gap-0.5 text-[11.5px] text-white/65 tabular-nums shrink-0 ml-auto">
            <Star className="h-3 w-3 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
            {deal.seller.rating.toFixed(2)}
            <span className="text-white/40 ml-1">· {deal.seller.orders}</span>
          </span>
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-white/10 flex items-end justify-between gap-3 flex-wrap">
          <div className="flex flex-col">
            <div className="inline-flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-white tabular-nums leading-none">
                {formatMoney(deal.price, 'USD')}
              </span>
              <span className="font-mono text-[12px] text-white/45 line-through tabular-nums">
                {formatMoney(deal.originalPrice, 'USD')}
              </span>
            </div>
            <span className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">
              Save {formatMoney(saved, 'USD')}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[hsl(var(--primary))] text-white text-[12.5px] font-bold group-hover:bg-[hsl(var(--primary-hover))] transition-colors shrink-0">
            Grab now
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function DealSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 overflow-hidden">
      <div className="aspect-[16/10] bg-white/[0.06] animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-1.5 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="h-7 w-1/3 rounded bg-white/[0.06] animate-pulse mt-4" />
      </div>
    </div>
  );
}
