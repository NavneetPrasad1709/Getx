'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Flame,
  Lock,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react';

/* Hero — gaming-platform dashboard pattern.
 *
 * Inspired by tournament/competition platform UIs. Big featured hero
 * card (game art left, copy + stats + buyer avatars right), then a
 * "Featured drops" row of 4 listing cards with countdowns, slot
 * progress bars, and direct CTAs. Built to feel like a serious gaming
 * marketplace — not a SaaS pitch.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

interface Drop {
  id: string;
  /* Countdown lifetime in seconds — used for the timer display */
  countdownTo: string;
  date: string;
  title: string;
  description: string;
  price: string;
  was?: string;
  slotsTotal: number;
  slotsTaken: number;
  hue: number;
  hot?: boolean;
}

const FEATURED_DROPS: Drop[] = [
  {
    id: 'lv50-mystic-hundo',
    countdownTo: '07:45:24',
    date: 'SAT, 18 MAY 15:00',
    title: 'Lv 50 Mystic · Hundo Mewtwo',
    description: 'OG 2018 Mystic trainer with 12 legendaries and a hundo Mewtwo. Auto-delivery.',
    price: '$189',
    was: '$219',
    slotsTotal: 24,
    slotsTaken: 15,
    hue: 220,
    hot: true,
  },
  {
    id: 'pokecoins-14500',
    countdownTo: '12:25:59',
    date: 'SUN, 19 MAY 12:35',
    title: '14,500 PokéCoins · auto',
    description: 'Instant top-up via verified payment rails. Zero ban risk on your account.',
    price: '$62',
    slotsTotal: 30,
    slotsTaken: 12,
    hue: 38,
  },
  {
    id: 'lv47-valor-200shinies',
    countdownTo: '35:20:05',
    date: 'MON, 20 MAY 19:50',
    title: 'Lv 47 Valor · 200 shinies',
    description: 'OG 2018 Valor account with 200+ verified shinies and 8 legendaries.',
    price: '$236',
    slotsTotal: 15,
    slotsTaken: 7,
    hue: 348,
    hot: true,
  },
  {
    id: 'master-league-push',
    countdownTo: '04:33:48',
    date: 'TUE, 21 MAY 10:00',
    title: 'Master League rank push 2,800+',
    description: 'PRO booster pushes your account to Master League in under 5 days.',
    price: '$52',
    was: '$70',
    slotsTotal: 40,
    slotsTaken: 26,
    hue: 158,
  },
];

const BUYER_AVATARS = [
  { hue: 220, initial: 'K' },
  { hue: 38, initial: 'M' },
  { hue: 348, initial: 'N' },
  { hue: 158, initial: 'S' },
  { hue: 195, initial: 'A' },
];

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════
          HERO — 100vh full-bleed cinematic
          Zero padding. Hero fills the viewport so it reads as the opening
          "shot" of the product. Featured drops moves to its own section.
          ════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="GETX marketplace"
        className="relative overflow-hidden min-h-[88svh] lg:min-h-[79vh] flex flex-col"
      >
        {/* MOBILE HERO — full-bleed, fills section */}
        <MobileHero reduce={!!reduce} />

        {/* DESKTOP HERO — full-bleed, fills section */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="
            hidden lg:flex flex-1
            relative overflow-hidden
          "
        >
          {/* Full-bleed background image with rich gradients.
              Mobile uses a stronger bottom-up wash since all content sits
              over the lower 60% of the image. Desktop keeps the left-right
              fade for the side-by-side layout. */}
          <div className="absolute inset-0">
            <Image
              src="/games/pokemon-go/pokemongo-game.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[60%_30%] lg:object-center"
            />
            {/* Mobile: heavy bottom wash for content legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/35 lg:hidden" />
            {/* Desktop: left-right wash for side-by-side layout */}
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-black/95 via-black/72 to-black/45" />
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-black/85 via-black/30 to-black/25" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_15%_60%,hsl(var(--primary)/0.30),transparent_65%)]" />
          </div>

          {/* Content layer — desktop full-bleed: grid spans the section,
              content centered with comfortable inner padding. */}
          <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-5 lg:gap-12 items-end lg:items-center w-full max-w-[1400px] mx-auto px-8 lg:px-14 py-12 lg:py-16">
            {/* LEFT — game cover (DESKTOP ONLY; mobile uses bg image itself) */}
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="
                hidden lg:block
                relative w-[200px] xl:w-[240px] aspect-[3/4] shrink-0
                rounded-2xl overflow-hidden
                ring-2 ring-white/20
                shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65)]
              "
            >
              <Image
                src="/games/pokemon-go/pokemongo-game.webp"
                alt="Pokémon GO cover"
                fill
                sizes="160px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-2 inset-x-2 text-center">
                <div className="font-display font-extrabold text-white text-[10px] uppercase tracking-[0.2em]">
                  Pokémon GO
                </div>
              </div>
            </motion.div>

            {/* CENTER — title block, stats */}
            <div className="text-white">
              {/* Member count chip with platform icons */}
              <motion.div
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                className="inline-flex items-center gap-2 mb-4"
              >
                <span
                  className="
                    inline-flex items-center gap-1.5 rounded-full
                    px-3 py-1.5
                    bg-white/10 backdrop-blur-md ring-1 ring-white/20
                    text-[10.5px] uppercase tracking-[0.22em] font-mono font-bold text-white
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Pokémon GO marketplace
                </span>
              </motion.div>

              {/* Hero headline — mobile gets big bold treatment */}
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
                className="
                  font-display font-black uppercase
                  leading-[0.86] tracking-[-0.025em]
                  text-[clamp(2.5rem,6vw,5rem)] text-white
                  [text-shadow:0_4px_28px_rgb(0_0_0_/_0.65)]
                  mb-4
                "
              >
                Grab a{' '}
                <span className="italic font-light text-primary">verified</span>
                <br />
                Pokémon GO drop.
              </motion.h1>

              {/* Subhead */}
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
                className="text-[13.5px] md:text-[15px] text-white/80 mb-5 max-w-xl"
              >
                Verified accounts, top-ups, items & boosting. Escrow-protected,
                delivered in 5 minutes.
              </motion.p>

              {/* PROMISE STRIP — operational guarantees instead of fake
                  counters. Each is verifiable: escrow on every order,
                  same-day default delivery, government-ID verification. */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                className="flex flex-wrap items-center gap-x-7 gap-y-4 mb-5"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="h-5 w-5 text-accent shrink-0" strokeWidth={2.25} />
                  <div>
                    <div className="font-display font-extrabold text-white text-[15px] leading-tight">
                      Escrow
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/65 mt-0.5">
                      On every order
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block h-8 w-px bg-white/15" />
                <div className="flex items-center gap-2.5">
                  <Clock className="h-5 w-5 text-accent shrink-0" strokeWidth={2.25} />
                  <div>
                    <div className="font-display font-extrabold text-white text-[15px] leading-tight">
                      Same-day
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/65 mt-0.5">
                      Default delivery
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block h-8 w-px bg-white/15" />
                <div className="flex items-center gap-2.5">
                  <BadgeCheck className="h-5 w-5 text-accent shrink-0" strokeWidth={2.25} />
                  <div>
                    <div className="font-display font-extrabold text-white text-[15px] leading-tight">
                      ID-verified
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/65 mt-0.5">
                      Every seller
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* CTAs — full-width on mobile, inline on desktop */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3"
              >
                <Link
                  href="/games/pokemon-go/accounts"
                  className="
                    group inline-flex items-center justify-center gap-2
                    h-12 px-6 rounded-full w-full sm:w-auto
                    bg-gradient-to-b from-primary to-primary-hover
                    text-primary-foreground text-[14px] font-bold tracking-tight
                    shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.25),inset_0_-2px_0_hsl(0_0%_0%/0.15)]
                    hover:-translate-y-px hover:from-primary-hover hover:to-primary
                    transition-all duration-150
                  "
                >
                  Browse drops
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="
                    inline-flex items-center justify-center gap-1.5
                    h-12 px-5 rounded-full w-full sm:w-auto
                    bg-white/10 backdrop-blur-md ring-1 ring-white/20
                    text-white text-[13.5px] font-semibold
                    hover:bg-white/15 hover:ring-white/35
                    transition-all duration-150
                  "
                >
                  How escrow works
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>
            </div>

            {/* RIGHT — Founding community badge with avatar stack.
                Replaced fictional "565 buyers shopping now" counter with
                honest early-access framing. Avatars stay as visual
                community signal (not factual claims). */}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
              className="hidden lg:block shrink-0 relative"
            >
              <div className="text-right mb-3">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent font-bold mb-1.5">
                  Founding community
                </div>
                <div className="font-display font-bold text-white text-[18px] leading-tight">
                  Early access
                </div>
                <div className="text-[11px] text-white/65 mt-0.5">
                  Launching now
                </div>
              </div>
              <div className="flex items-center -space-x-2 justify-end">
                {BUYER_AVATARS.map((a, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white ring-2 ring-black/80"
                    style={{
                      background: `linear-gradient(135deg, hsl(${a.hue} 80% 50%), hsl(${(a.hue + 30) % 360} 80% 35%))`,
                    }}
                  >
                    {a.initial}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* MOBILE — top-left corner identity chip (Pokémon GO + Live).
              Fills the empty upper-image area with brand context so the
              card reads instantly even before user scrolls to content. */}
          <div className="lg:hidden absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-black/55 backdrop-blur-md ring-1 ring-white/15 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white">
              <Zap className="h-3 w-3 fill-current text-primary" strokeWidth={2.5} />
              Pokémon GO
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-success/25 backdrop-blur-md ring-1 ring-success/40 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))] animate-pulse" />
              Live
            </span>
          </div>

          {/* DESKTOP — bottom-right decorative tags */}
          <div className="absolute bottom-4 right-4 z-10 hidden lg:flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-success/20 ring-1 ring-success/30 text-[9.5px] font-mono uppercase tracking-[0.22em] font-bold text-success backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))] animate-pulse" />
              Live now
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-black/55 ring-1 ring-white/15 text-[9.5px] font-mono uppercase tracking-[0.22em] font-bold text-white backdrop-blur-md">
              <Shield className="h-3 w-3 text-success" strokeWidth={2.5} />
              3-day refund guarantee
            </span>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FEATURED DROPS — separate section with its own container padding
          ════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Featured drops"
        className="relative py-16 md:py-20"
      >
        <div className="container">
          <div className="flex items-end justify-between gap-4 mb-6 md:mb-8 flex-wrap">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary mb-2 font-bold">
                Live marketplace
              </div>
              <h2 className="font-display font-bold leading-[0.95] tracking-[-0.025em] text-[clamp(1.875rem,4vw,2.75rem)] text-foreground">
                Featured drops
              </h2>
              <p className="text-[13px] text-foreground/80 mt-1.5">
                Live now and shipping soon
              </p>
            </div>
            <Link
              href="/games/pokemon-go/accounts"
              className="
                inline-flex items-center gap-1.5
                text-[12.5px] font-semibold text-primary
                border-b border-primary/30 hover:border-primary pb-0.5
                transition-all
              "
            >
              See all drops
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {FEATURED_DROPS.map((drop, i) => (
              <DropCard key={drop.id} drop={drop} index={i} reduce={!!reduce} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   MOBILE HERO — Elite Gamers Arena style
   Deep navy gradient card with character art bleeding behind. Massive
   chunky display headline, icon-led stat row, "BUYERS" callout with
   avatar stack, and a featured drop preview banner at the bottom.
   ──────────────────────────────────────────────────────────────────── */
function MobileHero({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="
        lg:hidden relative flex-1
        overflow-hidden flex flex-col
      "
      style={{
        backgroundImage:
          'linear-gradient(165deg, hsl(218 60% 22%) 0%, hsl(220 70% 14%) 45%, hsl(222 80% 9%) 100%)',
      }}
    >
      {/* ─ Background character art — Pokémon GO scene bleeds in
          softly behind the content, with overlays to reinforce the
          deep-navy tone. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <Image
          src="/games/pokemon-go/pokemongo-game.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_30%] opacity-90"
        />
        {/* Vertical darkening — image stays vibrant at the top where
            there's no text, fades to deep navy at the bottom where CTAs
            sit. Gives the hero a cinematic poster feel without washing
            the artwork out. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(222_45%_8%/0.30)_0%,hsl(222_55%_8%/0.55)_45%,hsl(222_75%_6%/0.92)_100%)]" />
        {/* Primary radial glow bottom-left — anchors the CTA cluster */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_90%,hsl(var(--primary)/0.30),transparent_60%)]" />
        {/* Subtle cyan kiss top-right */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_10%,hsl(195_85%_55%/0.14),transparent_55%)]" />
        {/* Faint dot grid texture — sits over everything for a hint of
            structure without becoming noise. */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(rgb(255 255 255) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      {/* ─ CONTENT — flex column that distributes across 100vh.
          Top group: meta row. Middle group: eyebrow + headline + sub
          (vertically centered for visual weight). Bottom group: stats +
          BUYERS + CTAs + scroll cue. ─────────────────────────────── */}
      <div className="relative flex-1 flex flex-col px-5 sm:px-6 pt-6 pb-7 z-10">
        {/* TOP META ROW — Listings chip + platform glyphs */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          className="flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/[0.06] backdrop-blur-md ring-1 ring-white/15 text-[10.5px] uppercase tracking-[0.22em] font-mono font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-white/85">Verified marketplace</span>
          </span>
          <div className="flex items-center gap-2">
            <span
              aria-label="iOS"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] ring-1 ring-white/10 text-white/80"
            >
              <Apple />
            </span>
            <span
              aria-label="Android"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] ring-1 ring-white/10 text-white/80"
            >
              <Android />
            </span>
          </div>
        </motion.div>

        {/* MIDDLE GROUP — eyebrow + massive headline + subhead.
            Pushed to vertical center of the available space via flex
            distribution. */}
        <div className="flex-1 flex flex-col justify-center py-6">
          {/* MASSIVE display headline */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="
              font-display font-black uppercase
              leading-[0.86] tracking-[-0.025em]
              text-[clamp(2rem,11vw,4.5rem)] text-white
              [text-shadow:0_4px_28px_rgb(0_0_0_/_0.55)]
              mb-4
            "
          >
            Buy verified
            <br />
            Pokémon GO
            <br />
            <span className="text-accent">drops.</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
            className="text-[14.5px] text-white/80 leading-relaxed max-w-[340px] font-medium"
          >
            Accounts, top-ups, items & boosting — escrow-protected,
            delivered in 5 minutes.
          </motion.p>
        </div>

        {/* BOTTOM GROUP — stats strip + BUYERS callout + CTAs */}
        <div>
          {/* PROMISE STRIP — operational guarantees, not fake counters.
              Each is a verifiable commitment: escrow on every order,
              same-day delivery default, government-ID seller checks. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
            className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-white/10"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent shrink-0" strokeWidth={2.5} />
              <div>
                <div className="font-display text-[13px] font-extrabold leading-tight text-white">
                  Escrow
                </div>
                <div className="text-[11.5px] text-white/75 mt-0.5 font-semibold uppercase tracking-wider">
                  On every order
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent shrink-0" strokeWidth={2.5} />
              <div>
                <div className="font-display text-[13px] font-extrabold leading-tight text-white">
                  Same-day
                </div>
                <div className="text-[11.5px] text-white/75 mt-0.5 font-semibold uppercase tracking-wider">
                  Default delivery
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-accent shrink-0" strokeWidth={2.5} />
              <div>
                <div className="font-display text-[13px] font-extrabold leading-tight text-white">
                  ID-verified
                </div>
                <div className="text-[11.5px] text-white/75 mt-0.5 font-semibold uppercase tracking-wider">
                  Every seller
                </div>
              </div>
            </div>
          </motion.div>

          {/* COMMUNITY callout — early-access framing, no fake counter.
              Avatars are visual community signal, the label is honest. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.56, ease: EASE }}
            className="flex items-center justify-between gap-3 mb-5"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent font-bold mb-1">
                Founding community
              </div>
              <div className="font-display text-[16px] font-bold leading-tight text-white">
                Early access · launching now
              </div>
            </div>
            <div className="flex items-center -space-x-2 shrink-0">
              {BUYER_AVATARS.slice(0, 4).map((a, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white ring-2 ring-[hsl(222_80%_9%)] shadow-[0_4px_12px_rgb(0_0_0_/_0.4)]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${a.hue} 80% 55%), hsl(${(a.hue + 30) % 360} 80% 40%))`,
                  }}
                >
                  {a.initial}
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTAs — primary glow + glass ghost */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.62, ease: EASE }}
            className="flex flex-col gap-2.5"
          >
            <Link
              href="/games/pokemon-go/accounts"
              className="
                group relative inline-flex items-center justify-center gap-2
                h-[52px] px-7 rounded-full w-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[15px] font-bold tracking-tight
                shadow-[0_10px_30px_-4px_hsl(var(--primary)/0.65),inset_0_1px_0_hsl(0_0%_100%/0.30),inset_0_-2px_0_hsl(0_0%_0%/0.18)]
                active:translate-y-px
                transition-all duration-150
              "
            >
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top,hsl(0_0%_100%/0.25),transparent_60%)] pointer-events-none" />
              Browse drops
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/how-it-works"
              className="
                inline-flex items-center justify-center gap-1.5
                h-12 px-5 rounded-full w-full
                bg-white/[0.12] ring-1 ring-white/30 backdrop-blur-md
                text-white text-[13.5px] font-semibold
                hover:bg-white/[0.18] hover:ring-white/40
                transition-all duration-150
              "
            >
              How escrow works
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* Tiny platform glyphs — single-tone inline SVGs sized for the meta row */
function Apple() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}
function Android() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        fill="currentColor"
        d="M17.5 9c-.41 0-.75-.34-.75-.75V5.5c0-.41.34-.75.75-.75s.75.34.75.75v2.75c0 .41-.34.75-.75.75zm-11 0c-.41 0-.75-.34-.75-.75V5.5c0-.41.34-.75.75-.75s.75.34.75.75v2.75c0 .41-.34.75-.75.75zM4 10.5h16v8.25A1.75 1.75 0 0 1 18.25 20.5h-1V22c0 .55-.45 1-1 1s-1-.45-1-1v-1.5h-2V22c0 .55-.45 1-1 1s-1-.45-1-1v-1.5h-2V22c0 .55-.45 1-1 1s-1-.45-1-1v-1.5h-1A1.75 1.75 0 0 1 4 18.75V10.5zm12.27-7.84.95-1.42a.35.35 0 1 0-.59-.39l-.95 1.43A6.45 6.45 0 0 0 12 1.5c-1.34 0-2.59.39-3.68 1.05L7.37 1.12a.35.35 0 1 0-.59.39l.95 1.42A6.5 6.5 0 0 0 4 8.5h16a6.5 6.5 0 0 0-3.73-5.84zM9.2 6.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm5.6 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"
      />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   DROP CARD — tournament-style listing card
   Top: thumbnail + countdown overlay + game tag
   Body: date, title, description
   Footer: price + slot fill bar + CTA
   ──────────────────────────────────────────────────────────────────── */
function DropCard({
  drop,
  index,
  reduce,
}: {
  drop: Drop;
  index: number;
  reduce: boolean;
}) {
  const fillPct = (drop.slotsTaken / drop.slotsTotal) * 100;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06 * index, ease: EASE }}
    >
      {/* UIUX-001: the showcase cards are illustrative, not real listings, so
          they route to the real Accounts browse page instead of a phantom
          per-listing slug that 404s. */}
      <Link
        href="/games/pokemon-go/accounts"
        className="
          group block overflow-hidden rounded-2xl
          bg-surface ring-1 ring-border
          shadow-[0_2px_8px_hsl(0_0%_0%/0.05)]
          hover:ring-foreground/25 hover:-translate-y-1
          hover:shadow-[0_18px_40px_-14px_hsl(var(--primary)/0.25)]
          transition-all duration-200
        "
      >
        {/* ── THUMBNAIL ──────────────────────────────────────────────
            Clean Pokémon GO image, subtle dark bottom-vignette for
            text legibility. Removed the heavy colored per-card tint
            that was washing out the artwork. */}
        <div className="relative aspect-[16/10] overflow-hidden bg-[#0a0a0c]">
          <Image
            src="/games/pokemon-go/pokemongo-game.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Vignettes — top for badges, bottom for game tag */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/65 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent"
          />

          {/* Per-card accent stripe at the bottom — single hairline tint
              keeps card identity without dominating the image */}
          <div
            aria-hidden
            className="absolute bottom-0 inset-x-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, transparent, hsl(${drop.hue} 80% 55%), transparent)`,
            }}
          />

          {/* Countdown timer — top-left */}
          <div className="absolute top-3 left-3 z-10">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-md ring-1 ring-white/15 px-2 py-1 font-mono text-[11px] font-bold text-white tabular-nums">
              <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
              {drop.countdownTo}
            </div>
          </div>

          {/* HOT badge — only on hot drops, primary brand color */}
          {drop.hot ? (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-[0.18em] font-mono font-bold shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.5)]">
                <Flame className="h-2.5 w-2.5 fill-current" strokeWidth={2.5} />
                Hot
              </span>
            </div>
          ) : null}

          {/* Game tag — bottom-left, glassy not yellow */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-black/70 backdrop-blur-md ring-1 ring-white/15 text-white text-[10px] uppercase tracking-[0.18em] font-mono font-bold">
              <Zap className="h-2.5 w-2.5 fill-current text-primary" strokeWidth={2.5} />
              Pokémon GO
            </span>
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────── */}
        <div className="p-4">
          {/* Date */}
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-primary mb-1.5">
            {drop.date}
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-[14.5px] leading-snug text-foreground mb-2 line-clamp-1">
            {drop.title}
          </h3>

          {/* Description */}
          <p className="text-[12px] text-foreground/85 leading-relaxed mb-4 line-clamp-2 min-h-[2.6em]">
            {drop.description}
          </p>

          {/* Price + CTA — price as bold display number, CTA as primary pill */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[20px] font-extrabold tabular-nums text-foreground leading-none">
                {drop.price}
              </span>
              {drop.was ? (
                <span className="text-[11.5px] text-foreground/65 line-through tabular-nums">
                  {drop.was}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono uppercase tracking-[0.15em] text-success ml-1">
                <Shield className="h-2.5 w-2.5" strokeWidth={2.5} />
                Escrow
              </span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-primary/10 ring-1 ring-primary/25 text-primary text-[11.5px] font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary transition-colors">
              Buy now
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Slot fill bar + count */}
          <div className="pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 mb-1.5">
              {/* Mini buyer avatars */}
              <div className="flex items-center -space-x-1.5">
                {BUYER_AVATARS.slice(0, 3).map((a, i) => (
                  <div
                    key={i}
                    className="h-5 w-5 rounded-full grid place-items-center text-[8px] font-bold text-white ring-2 ring-surface"
                    style={{
                      background: `linear-gradient(135deg, hsl(${a.hue} 80% 50%), hsl(${(a.hue + 30) % 360} 80% 35%))`,
                    }}
                  >
                    {a.initial}
                  </div>
                ))}
              </div>
              <span className="font-mono text-[10.5px] text-foreground/85">
                <span className="text-foreground font-bold tabular-nums">{drop.slotsTaken}</span>
                /{drop.slotsTotal} taken
              </span>
              <span
                className={`ml-auto text-[10px] font-mono font-bold tabular-nums ${
                  fillPct >= 70 ? 'text-accent' : 'text-success'
                }`}
              >
                {Math.round(fillPct)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fillPct >= 70
                    ? 'bg-gradient-to-r from-accent to-accent-hover'
                    : 'bg-gradient-to-r from-success to-success'
                }`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
