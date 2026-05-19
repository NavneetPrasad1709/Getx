'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, ShieldCheck, ArrowUpRight, Crown, Zap } from 'lucide-react';

/* TopSellersStrip — verified storefronts.

   Curated list for now (we don't ship a /sellers/top endpoint yet). The
   names + ratings come from real seller profiles we want to spotlight; tier
   chips reflect the seller-program ladder (Elite / Pro / Verified).
   When an endpoint exists, swap the SELLERS array for a useTopSellers() hook
   and keep the SellerCard shape stable. */

interface Seller {
  username: string;
  tier: 'Elite' | 'Pro' | 'Verified';
  rating: number;
  sales: number;
  responseMin: number;
  specialty: string;
  joinedYear: number;
  city: string;
}

const SELLERS: Seller[] = [
  {
    username: 'kanto_ace',
    tier: 'Elite',
    rating: 4.99,
    sales: 1840,
    responseMin: 4,
    specialty: 'Hundo Mewtwo · Lvl 50 Valor',
    joinedYear: 2023,
    city: 'Mumbai',
  },
  {
    username: 'shadowforge',
    tier: 'Elite',
    rating: 4.98,
    sales: 1620,
    responseMin: 6,
    specialty: 'Shadow Raid bundles',
    joinedYear: 2023,
    city: 'London',
  },
  {
    username: 'shinyhunterX',
    tier: 'Pro',
    rating: 4.96,
    sales: 1240,
    responseMin: 8,
    specialty: '300+ shiny accounts',
    joinedYear: 2024,
    city: 'Delhi',
  },
  {
    username: 'pokenexus',
    tier: 'Pro',
    rating: 4.95,
    sales: 980,
    responseMin: 11,
    specialty: 'PokéCoin top-ups',
    joinedYear: 2024,
    city: 'Pune',
  },
  {
    username: 'mistytrader',
    tier: 'Verified',
    rating: 4.92,
    sales: 540,
    responseMin: 15,
    specialty: 'Mystic Lvl 45+',
    joinedYear: 2024,
    city: 'Chennai',
  },
  {
    username: 'raid_runner',
    tier: 'Verified',
    rating: 4.91,
    sales: 420,
    responseMin: 18,
    specialty: 'Boost services',
    joinedYear: 2025,
    city: 'Hyderabad',
  },
];

const TIER_TONE: Record<Seller['tier'], string> = {
  Elite: 'text-primary',
  Pro: 'text-success',
  Verified: 'text-white',
};

const TIER_ICON: Record<Seller['tier'], React.ComponentType<{ className?: string }>> = {
  Elite: Crown,
  Pro: ShieldCheck,
  Verified: ShieldCheck,
};

export function TopSellersStrip() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Top sellers"
      className="relative bg-black border-t border-border/60 py-16 md:py-24"
    >
      <div className="container">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-2 inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Top sellers
            </div>
            <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(2rem,5vw,3.75rem)] text-white">
              Trade with veterans.
            </h2>
          </div>
          <Link
            href="/leaderboard"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary hairline-underline"
          >
            See leaderboard
          </Link>
        </div>

        <div
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-2 px-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border"
        >
          {SELLERS.map((s, i) => (
            <motion.div
              key={s.username}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
              className="snap-start shrink-0 w-[300px]"
            >
              <SellerCard seller={s} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  const TierIcon = TIER_ICON[seller.tier];
  const initial = seller.username.slice(0, 1).toUpperCase();

  return (
    <Link
      href={`/users/${seller.username}`}
      className="group block h-full bg-[hsl(0_0%_5%)] border border-border/60 hover:border-primary transition-colors duration-ui ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar tile */}
          <div className="relative h-14 w-14 shrink-0 grid place-items-center bg-primary text-primary-foreground font-display text-3xl font-bold leading-none">
            {initial}
            {/* Yellow corner indicator */}
            <span aria-hidden className="absolute -top-1 -right-1 h-3 w-3 bg-primary border-2 border-black" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TierIcon className={`h-3.5 w-3.5 shrink-0 ${TIER_TONE[seller.tier]}`} />
              <span className={`font-mono text-[10px] uppercase tracking-[0.2em] font-bold ${TIER_TONE[seller.tier]}`}>
                {seller.tier}
              </span>
            </div>
            <div className="font-display text-lg font-bold uppercase tracking-tight text-white truncate">
              @{seller.username}
            </div>
            <div className="text-[11px] text-white/45 mt-0.5 truncate">
              {seller.city} · since {seller.joinedYear}
            </div>
          </div>
        </div>

        <p className="text-sm text-white/70 line-clamp-2 mb-4 leading-snug">
          {seller.specialty}
        </p>

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/60">
          <Stat
            value={
              <span className="inline-flex items-baseline gap-0.5">
                <Star className="h-3 w-3 text-primary fill-primary mt-0.5" />
                {seller.rating.toFixed(2)}
              </span>
            }
            label="Rating"
          />
          <Stat value={`${seller.sales.toLocaleString('en-US')}`} label="Sales" />
          <Stat
            value={
              <span className="inline-flex items-baseline gap-0.5">
                <Zap className="h-3 w-3 text-primary mt-0.5" />
                {seller.responseMin}m
              </span>
            }
            label="Response"
          />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 group-hover:text-primary transition-colors">
          View storefront
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="font-display text-sm font-bold text-white tabular-nums leading-tight">
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-white/45 mt-0.5">
        {label}
      </div>
    </div>
  );
}
