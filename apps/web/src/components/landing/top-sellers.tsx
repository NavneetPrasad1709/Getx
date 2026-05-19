'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BadgeCheck,
  Star,
  Crown,
  Trophy,
  Zap,
  Award,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';

/* TopSellers — featured-seller grid.

   Six sellers with gradient initials avatars, named tier badges (PRO /
   TOP / VERIFIED / RISING), and a small stat strip (orders / rating /
   response time). Doubles as buyer-trust signal AND seller recruitment
   anchor — the final CTA below the grid sells the "become a seller"
   pitch. Dark surface continues the marketplace band. */

const EASE = [0.22, 1, 0.36, 1] as const;

interface SellerTier {
  label: string;
  color: string;
  bgTint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TIERS: Record<string, SellerTier> = {
  pro: {
    label: 'PRO',
    color: '#FFCB05',
    bgTint: 'rgba(255,203,5,0.15)',
    icon: Crown,
  },
  top: {
    label: 'TOP',
    color: '#FF3B5C',
    bgTint: 'rgba(255,59,92,0.15)',
    icon: Trophy,
  },
  verified: {
    label: 'VERIFIED',
    color: '#3B82F6',
    bgTint: 'rgba(59,130,246,0.15)',
    icon: BadgeCheck,
  },
  rising: {
    label: 'RISING',
    color: '#10B981',
    bgTint: 'rgba(16,185,129,0.15)',
    icon: Zap,
  },
};

interface Seller {
  handle: string;
  name: string;
  city: string;
  avatarGrad: string;
  tier: keyof typeof TIERS;
  rating: number;
  orders: number;
  responseTime: string;
  specialty: string;
  joined: string;
  topItem: string;
}

/* Featured seller mix — globally distributed to reflect GETX's
   multi-region marketplace (US, UK, EU, LATAM, APAC, India). Names
   and locations are seed data; replace with real top-seller picks
   when the leaderboard ships. */
const SELLERS: Seller[] = [
  {
    handle: '@nightraidr',
    name: 'Marcus Hale',
    city: 'London, UK',
    avatarGrad: 'linear-gradient(135deg, #FF1B1B 0%, #FFCB05 100%)',
    tier: 'pro',
    rating: 4.98,
    orders: 412,
    responseTime: '< 5 min',
    specialty: 'Lv 50 Valor accounts · Hundo Mewtwo',
    joined: 'May 2023',
    topItem: 'Veteran Vault · $531',
  },
  {
    handle: '@mystic.lp',
    name: 'Lucia Pereira',
    city: 'São Paulo, BR',
    avatarGrad: 'linear-gradient(135deg, #3B4CCA 0%, #7AC4FF 100%)',
    tier: 'top',
    rating: 4.97,
    orders: 240,
    responseTime: '< 8 min',
    specialty: 'Shiny collections · Raid pass bundles',
    joined: 'Aug 2023',
    topItem: 'Shiny Haul Lv 47 · $236',
  },
  {
    handle: '@instinct_yk',
    name: 'Yuna Kim',
    city: 'Seoul, KR',
    avatarGrad: 'linear-gradient(135deg, #FFCB05 0%, #F7A300 100%)',
    tier: 'pro',
    rating: 4.95,
    orders: 186,
    responseTime: '< 6 min',
    specialty: 'Master League boost · GoBattle 2800+',
    joined: 'Sep 2023',
    topItem: 'Master Rank Push · $52',
  },
  {
    handle: '@raidleader_m',
    name: 'Arjun Mehta',
    city: 'Bengaluru, IN',
    avatarGrad: 'linear-gradient(135deg, #10B981 0%, #A7F3D0 100%)',
    tier: 'verified',
    rating: 4.96,
    orders: 158,
    responseTime: '< 4 min',
    specialty: '5★ legendary raid joins · hosted',
    joined: 'Oct 2023',
    topItem: 'Legendary Raid Join · $3',
  },
  {
    handle: '@coinvault.de',
    name: 'Lena Becker',
    city: 'Berlin, DE',
    avatarGrad: 'linear-gradient(135deg, #7A5AF8 0%, #C4B5FD 100%)',
    tier: 'verified',
    rating: 4.94,
    orders: 134,
    responseTime: '< 7 min',
    specialty: 'PokéCoin top-ups · Auto delivery',
    joined: 'Nov 2023',
    topItem: '14,500 PokéCoins · $62',
  },
  {
    handle: '@pokestarter',
    name: 'Diego Alvarez',
    city: 'Austin, US',
    avatarGrad: 'linear-gradient(135deg, #FF6B35 0%, #FFD7B5 100%)',
    tier: 'rising',
    rating: 4.92,
    orders: 92,
    responseTime: '< 9 min',
    specialty: 'Beginner accounts · starter packs',
    joined: 'Feb 2024',
    topItem: 'Lv 42 Valor Starter · $62',
  },
];

export function TopSellers() {
  const reduce = useReducedMotion();
  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || '/sellers/program';

  return (
    <section
      aria-label="Top sellers"
      className="relative bg-[#0F0C26] text-white px-4 sm:px-6 lg:px-8 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-6 flex-wrap mb-10 md:mb-12"
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFCB05] bg-[#FFCB05]/10 ring-1 ring-[#FFCB05]/30 rounded-full px-3 py-1.5">
              <Award className="h-3 w-3" />
              Top Sellers
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Verified sellers, ranked by trade history.
            </h2>
            <p className="mt-2 text-[13px] sm:text-[14px] text-white/65 max-w-xl leading-relaxed">
              Every seller passes Sumsub identity verification. Tiers are
              earned through completed orders, response time, and a
              dispute-free record.
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-[13px] font-semibold transition-colors"
          >
            See leaderboard
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* Seller grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {SELLERS.map((s, i) => (
            <motion.div
              key={s.handle}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
            >
              <SellerCard seller={s} />
            </motion.div>
          ))}
        </div>

        {/* CTA strip */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 md:mt-14 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 px-5 sm:px-8 py-5 md:py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="h-5 w-5 text-[#10B981] shrink-0" />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-white truncate">
                Sell on GETX — KYC once, sell forever
              </div>
              <div className="text-[12px] text-white/55 truncate">
                12% flat commission · Stripe & PayPal payouts · onboarding support
              </div>
            </div>
          </div>
          <a
            href={sellerUrl}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-[#FFCB05] text-[#14102B] text-[13px] font-bold hover:brightness-95 hover:-translate-y-0.5 transition-all shadow-[0_10px_24px_-6px_rgba(255,203,5,0.55)]"
          >
            Apply to sell
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  const tier = TIERS[seller.tier];
  const initials = seller.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const Icon = tier.icon;

  return (
    <Link
      href={`/sellers/${seller.handle.replace('@', '')}`}
      className="group block rounded-2xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/30 hover:-translate-y-1 transition-all duration-300 p-5"
    >
      {/* Top — avatar + name + tier */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="h-12 w-12 rounded-full grid place-items-center text-white font-bold text-sm shrink-0"
          style={{ background: seller.avatarGrad }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="font-display text-[15px] font-extrabold text-white truncate">
              {seller.name}
            </div>
            <BadgeCheck className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
          </div>
          <div className="text-[11.5px] text-white/55 truncate">
            {seller.handle} · {seller.city}
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0"
          style={{
            color: tier.color,
            backgroundColor: tier.bgTint,
            boxShadow: `inset 0 0 0 1px ${tier.color}55`,
          }}
        >
          <Icon className="h-2.5 w-2.5" />
          {tier.label}
        </span>
      </div>

      {/* Specialty */}
      <p className="text-[12.5px] text-white/75 leading-relaxed mb-4 line-clamp-2 min-h-[2.2em]">
        {seller.specialty}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/8">
        <Stat label="Orders" value={`${seller.orders}`} />
        <Stat
          label="Rating"
          value={`${seller.rating.toFixed(2)}★`}
          accent="#FFCB05"
        />
        <Stat label="Reply" value={seller.responseTime} />
      </div>

      {/* Footer — top item + chevron */}
      <div className="flex items-center justify-between gap-2 text-[11.5px]">
        <div className="min-w-0">
          <div className="text-white/40 uppercase tracking-wider text-[9.5px] mb-0.5">
            Top item
          </div>
          <div className="text-white/85 truncate">{seller.topItem}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[#FFCB05] font-bold transition-transform group-hover:translate-x-0.5 shrink-0">
          View
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-white/40 mb-0.5">
        {label}
      </div>
      <div
        className="font-display text-[13.5px] font-extrabold tabular-nums text-white inline-flex items-center gap-1"
        style={accent ? { color: accent } : undefined}
      >
        {accent === '#FFCB05' ? <Star className="h-3 w-3 fill-current" /> : null}
        {value}
      </div>
    </div>
  );
}
