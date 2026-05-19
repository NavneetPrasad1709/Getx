'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Lock,
  ShieldCheck,
  Zap,
  Wallet,
  Bell,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';

/* GameShowcase — feature section.

   One large featured game card (Pokémon GO — the only live game today)
   anchors the section, with image left, marketing block + animated stats
   right. A trust-badge strip sits below the main CTA. Underneath, three
   roadmap cards announce upcoming titles with a "Notify me" affordance.
   The whole section sits on the light page canvas; cards are white with
   soft cobalt-tinted shadows. */

const EASE = [0.22, 1, 0.36, 1] as const;

const COMING_SOON = [
  {
    name: 'Valorant',
    tagline: 'Accounts · ranked boost',
    eta: 'Q3 2026',
    art: '/games/valorant/hero.svg',
    accent: 'from-rose-500/15 to-rose-500/0',
  },
  {
    name: 'BGMI',
    tagline: 'UC top-ups · skins',
    eta: 'Q4 2026',
    art: '/games/bgmi/hero.svg',
    accent: 'from-amber-500/15 to-amber-500/0',
  },
  {
    name: 'Genshin Impact',
    tagline: 'Genesis crystals · resin',
    eta: 'Q1 2027',
    art: '/games/genshin/hero.svg',
    accent: 'from-violet-500/15 to-violet-500/0',
  },
];

const STATS = [
  { v: '240+', l: 'Live listings', icon: TrendingUp },
  { v: 'Verified', l: 'Sumsub-KYC sellers', icon: Users },
  { v: '5 min', l: 'Median delivery', icon: Clock },
];

const TRUST_PILLS = [
  { icon: ShieldCheck, label: 'Escrow protected' },
  { icon: Zap, label: 'Instant delivery' },
  { icon: Wallet, label: 'Cards · PayPal · wallets' },
];

const FEATURE_TAGS = [
  'Trainer accounts',
  'PokéCoin top-ups',
  'Raid passes',
  'Boosting',
  'Hundo guarantees',
];

export function GameShowcase() {
  const reduce = useReducedMotion();

  return (
    <section
      id="game-showcase"
      aria-label="Our games"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28"
    >
      {/* Soft section ambience — radial cobalt wash, low opacity */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(700px 320px at 80% 10%, hsl(222 100% 56% / 0.06), transparent 60%)',
        }}
      />

      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex items-end justify-between gap-6 flex-wrap mb-10 md:mb-14"
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
              <Sparkles className="h-3 w-3" />
              Our Games
            </div>
            <h2 className="font-display font-extrabold text-[hsl(var(--foreground))] leading-[0.92] tracking-[-0.03em] text-[clamp(2rem,5.5vw,4rem)] mb-3">
              Trade what you play.
            </h2>
            <p className="text-[15px] md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl">
              One live marketplace today, three more coming. Every drop is
              escrow-protected, KYC-verified, and paid out in INR.
            </p>
          </div>
          <Link
            href="/games"
            className="group inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white border border-[hsl(var(--border))] text-[14px] font-medium text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors shadow-sm"
          >
            View all games
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        {/* Featured — Pokémon GO big card */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative"
        >
          {/* Outer gradient frame — subtle premium ring */}
          <div className="absolute -inset-px rounded-[1.85rem] bg-gradient-to-br from-[hsl(var(--primary)/0.3)] via-transparent to-transparent opacity-0 group-hover/featured:opacity-100 transition-opacity duration-500" />

          <Link
            href="/games/pokemon-go"
            className="group/featured relative block rounded-[1.75rem] overflow-hidden bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_2px_4px_hsl(222_24%_8%/0.04),0_24px_60px_hsl(222_24%_8%/0.08)] transition-all duration-ui ease-apple hover:shadow-[0_4px_8px_hsl(222_24%_8%/0.06),0_32px_80px_hsl(222_100%_56%/0.18)] hover:-translate-y-1"
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-stretch">
              {/* Big image */}
              <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[500px] overflow-hidden bg-[hsl(var(--surface-elevated))]">
                <Image
                  src="/games/pokemon-go/hero.svg"
                  alt="Pokémon GO trainer marketplace"
                  fill
                  sizes="(min-width: 1024px) 760px, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover/featured:scale-[1.04]"
                />

                {/* Top-left: live chip */}
                <div className="absolute top-5 left-5 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--primary))] shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--primary))] opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  </span>
                  Live now
                </div>

                {/* Top-right: starting price */}
                <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-sm rounded-2xl px-3.5 py-2 shadow-sm">
                  <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                    Starting from
                  </div>
                  <div className="font-display text-lg font-bold tabular-nums text-[hsl(var(--foreground))] leading-none">
                    $1
                  </div>
                </div>

                {/* Bottom: feature tag rail */}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURE_TAGS.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-medium text-white border border-white/25"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Copy */}
              <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] mb-3">
                  Featured · Pokémon GO
                </div>
                <h3 className="font-display font-extrabold text-[hsl(var(--foreground))] leading-[0.92] tracking-[-0.03em] text-[clamp(1.75rem,4vw,3rem)] mb-4">
                  India&apos;s home for Pokémon GO trading.
                </h3>
                <p className="text-[15px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-7 max-w-md">
                  Buy verified trainer accounts, top up PokéCoins via UPI, grab raid passes and
                  hire boosters — all under escrow with five-minute median delivery.
                </p>

                {/* Stats — icon + value + label */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {STATS.map((s) => (
                    <div
                      key={s.l}
                      className="rounded-2xl bg-[hsl(var(--surface-elevated))] px-3 py-3.5 border border-[hsl(var(--border))] transition-colors group-hover/featured:border-[hsl(var(--primary)/0.3)]"
                    >
                      <s.icon className="h-3.5 w-3.5 text-[hsl(var(--primary))] mb-2" />
                      <div className="font-display text-xl font-bold tabular-nums text-[hsl(var(--foreground))] leading-none mb-1">
                        {s.v}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Trust pills */}
                <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-7 text-[12px] text-[hsl(var(--muted-foreground))]">
                  {TRUST_PILLS.map((p) => (
                    <li key={p.label} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                      {p.label}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-[hsl(var(--primary))] text-white text-[14px] font-semibold transition-all group-hover/featured:bg-[hsl(var(--primary-hover))] group-hover/featured:shadow-[0_8px_24px_hsl(222_100%_56%/0.35)]">
                    Enter marketplace
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/featured:translate-x-1" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[hsl(var(--muted-foreground))]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-70 animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                    </span>
                    24 trainers buying right now
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Roadmap — coming soon section header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-16 mb-6 flex items-center gap-3"
        >
          <div className="h-px flex-1 bg-[hsl(var(--border))]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
            Next on the roadmap
          </span>
          <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        </motion.div>

        {/* Coming soon — three muted cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {COMING_SOON.map((g, i) => (
            <motion.div
              key={g.name}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: 0.08 * i, ease: EASE }}
            >
              <div className="group relative rounded-[1.5rem] overflow-hidden bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(222_24%_8%/0.04),0_8px_24px_hsl(222_24%_8%/0.04)] transition-all duration-ui ease-apple hover:-translate-y-1.5 hover:shadow-[0_4px_8px_hsl(222_24%_8%/0.06),0_20px_50px_hsl(222_100%_56%/0.1)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-[hsl(var(--surface-elevated))]">
                  <Image
                    src={g.art}
                    alt={g.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    loading="lazy"
                    className="object-cover opacity-85 grayscale-[60%] transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.05]"
                  />
                  {/* Soft color wash by game */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-tr ${g.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                    <Lock className="h-3 w-3" />
                    {g.eta}
                  </div>
                </div>

                <div className="p-5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-bold text-[hsl(var(--foreground))] truncate">
                      {g.name}
                    </div>
                    <div className="text-[13px] text-[hsl(var(--muted-foreground))] truncate">
                      {g.tagline}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-full bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary))] hover:text-white hover:border-[hsl(var(--primary))] transition-colors"
                  >
                    <Bell className="h-3 w-3" />
                    Notify
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
