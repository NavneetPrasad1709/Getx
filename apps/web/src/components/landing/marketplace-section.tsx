'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useInView,
  useMotionValue,
  animate,
} from 'framer-motion';
import {
  ArrowRight,
  User,
  Coins,
  Package,
  Sword,
  Flame,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react';
import { formatMoney } from '@/lib/currency';

/* MarketplaceSection — one tight Pokémon GO showcase.

   Replaces three previous sections (GameShowcase + CategoryPills + the
   OfferRail) with a single self-contained card. Left side stacks the
   pitch + 3 live stats + a 4-tile category strip; right side shows three
   trending listings the user can click straight into. Job: prove there
   is real inventory, in real INR, with real ratings, on the same screen
   the visitor first lands. */

const EASE = [0.22, 1, 0.36, 1] as const;

const CATEGORIES = [
  { href: '/games/pokemon-go/accounts', icon: User, label: 'Accounts', count: '240+' },
  { href: '/games/pokemon-go/top-ups', icon: Coins, label: 'Top-ups', count: '60+' },
  { href: '/games/pokemon-go/items', icon: Package, label: 'Items', count: '180+' },
  { href: '/games/pokemon-go/boosting', icon: Sword, label: 'Boosting', count: '7' },
];

const TRENDING = [
  {
    slug: 'm47-shiny-collection',
    title: 'Lv 47 Mystic · Shiny haul',
    sub: '124 Shinies · 12 Legendaries',
    price: 236,
    was: 306,
    rating: 4.95,
    team: '#3B4CCA',
    teamLabel: 'Mystic',
    badge: 'Top pick',
  },
  {
    slug: 'i45-tournament',
    title: 'Lv 45 Instinct · Master League',
    sub: 'Locked roster · GoBattle 2800+',
    price: 156,
    rating: 4.92,
    team: 'hsl(var(--primary))',
    teamLabel: 'Instinct',
  },
  {
    slug: 'v42-starter',
    title: 'Lv 42 Valor · Beginner pack',
    sub: '4 Legendaries · clean account',
    price: 62,
    was: 81,
    rating: 4.9,
    team: '#FF1B1B',
    teamLabel: 'Valor',
  },
];

export function MarketplaceSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="marketplace"
      aria-label="Pokémon GO marketplace"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* Section header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-6 flex-wrap mb-10 md:mb-14"
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
              <Flame className="h-3 w-3" />
              Live now · Pokémon GO
            </div>
            <h2 className="font-display font-extrabold leading-[0.92] tracking-[-0.025em] text-[clamp(2.25rem,5.5vw,4rem)] text-[hsl(var(--foreground))] mb-3">
              The marketplace,
              <br />
              <span className="text-[hsl(var(--primary))]">running today</span>.
            </h2>
            <p className="text-[15px] md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl">
              Hand-picked drops trending right now. Every one is escrow-protected.
              Tap a category to filter, or grab a listing direct.
            </p>
          </div>
          <Link
            href="/games/pokemon-go/accounts"
            className="group inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-[14px] font-semibold text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors shadow-sm"
          >
            View all 240+ drops
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-6 md:gap-8">
          {/* LEFT — category strip + stats */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[hsl(var(--surface))] rounded-3xl border border-[hsl(var(--border))] shadow-[0_2px_8px_hsl(0_0%_0%/0.06)] dark:shadow-[0_2px_8px_hsl(0_0%_0%/0.5)] overflow-hidden flex flex-col"
          >
            {/* Top — pitch + live stats */}
            <div className="p-7 md:p-9 border-b border-[hsl(var(--border))]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-2">
                Featured game
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] mb-3">
                Pokémon GO · India
              </h3>
              <p className="text-[14px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-6">
                Verified trainer accounts, PokéCoin top-ups, raid passes, and
                boosting — all escrow-protected, all UPI checkout.
              </p>

              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <Stat
                  icon={TrendingUp}
                  target={240}
                  suffix="+"
                  label="Live listings"
                />
                <Stat icon={Users} target={85} label="KYC sellers" />
                <Stat
                  icon={Clock}
                  target={5}
                  suffix=" min"
                  label="Median delivery"
                />
              </div>
            </div>

            {/* Bottom — category strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[hsl(var(--border))] border-t border-[hsl(var(--border))] -mt-px">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group relative p-5 md:p-6 hover:bg-[hsl(var(--surface-elevated))] transition-colors"
                >
                  <c.icon className="h-5 w-5 text-[hsl(var(--primary))] mb-3" />
                  <div className="font-display text-sm font-bold text-[hsl(var(--foreground))] mb-0.5">
                    {c.label}
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {c.count} live
                  </div>
                  <ArrowRight className="absolute top-5 right-5 h-3.5 w-3.5 text-[hsl(var(--muted-foreground)/0.4)] transition-all group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* RIGHT — three trending listings */}
          <div className="space-y-3 md:space-y-4">
            {TRENDING.map((l, i) => (
              <motion.div
                key={l.slug}
                initial={reduce ? false : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: EASE }}
              >
                <TrendingRow listing={l} />
              </motion.div>
            ))}
            <Link
              href="/games/pokemon-go/accounts"
              className="group flex items-center justify-center gap-1.5 py-4 text-[13px] font-semibold text-[hsl(var(--primary))] hover:underline"
            >
              See 237 more live drops
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  target,
  suffix = '',
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  target: number;
  suffix?: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] p-3.5">
      <Icon className="h-3.5 w-3.5 text-[hsl(var(--primary))] mb-2" />
      <div className="font-display text-base md:text-lg font-extrabold text-[hsl(var(--foreground))] tabular-nums leading-none mb-1">
        <Counter target={target} suffix={suffix} />
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
    </div>
  );
}

/* Counter — counts up from 0 to `target` once when the element first
   scrolls into view. Respects prefers-reduced-motion. */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const [display, setDisplay] = React.useState(reduce ? target : 0);

  React.useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(target);
      return;
    }
    const controls = animate(mv, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, reduce, mv]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function TrendingRow({
  listing,
}: {
  listing: (typeof TRENDING)[number];
}) {
  const discount = listing.was
    ? Math.round(((listing.was - listing.price) / listing.was) * 100)
    : 0;
  return (
    <Link
      href={`/games/pokemon-go/accounts/${listing.slug}`}
      className="group flex items-center gap-4 p-3.5 md:p-4 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] hover:shadow-[0_8px_24px_hsl(var(--primary)/0.15)] hover:-translate-y-0.5 transition-all duration-ui"
    >
      {/* Team-colored thumbnail */}
      <div
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl grid place-items-center shrink-0 text-white"
        style={{
          background: `linear-gradient(135deg, ${listing.team} 0%, ${listing.team}99 100%)`,
        }}
      >
        <svg viewBox="0 0 40 40" className="h-7 w-7 opacity-90" aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="20" cy="20" r="16" />
            <path d="M4 20h32" />
            <circle cx="20" cy="20" r="4" fill="currentColor" />
          </g>
        </svg>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: listing.team }}
          >
            {listing.teamLabel}
          </span>
          {listing.badge ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[9px] font-bold uppercase tracking-wider">
              {listing.badge}
            </span>
          ) : null}
          {discount > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] text-[9px] font-bold uppercase tracking-wider">
              −{discount}%
            </span>
          ) : null}
        </div>
        <div className="font-display text-sm sm:text-[15px] font-bold text-[hsl(var(--foreground))] truncate">
          {listing.title}
        </div>
        <div className="text-[11px] sm:text-[12px] text-[hsl(var(--muted-foreground))] truncate">
          {listing.sub} · ⭐ {listing.rating}
        </div>
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <div className="font-display text-base sm:text-lg font-extrabold tabular-nums text-[hsl(var(--foreground))] leading-none">
          {formatMoney(listing.price, 'USD')}
        </div>
        {listing.was ? (
          <div className="text-[10px] text-[hsl(var(--muted-foreground)/0.7)] line-through tabular-nums mt-1">
            {formatMoney(listing.was, 'USD')}
          </div>
        ) : null}
      </div>

      <ArrowRight className="hidden sm:block h-4 w-4 text-[hsl(var(--muted-foreground)/0.4)] shrink-0 transition-all group-hover:text-[hsl(var(--primary))] group-hover:translate-x-1" />
    </Link>
  );
}
