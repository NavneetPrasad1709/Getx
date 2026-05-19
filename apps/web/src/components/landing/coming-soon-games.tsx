'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

/* ComingSoonGames — roadmap section, light theme.

   Today: Pokémon GO is live. Next week, Roblox + Genshin Impact + BGMI
   onboard. This section turns "we only have one game" into an asset:
   what's landing, when, and a per-game waitlist email so we can ping
   users on launch day.

   Light page bg to match the rest of the homepage (the previous dark
   cosmic treatment broke the visual rhythm). Per-game accent on the
   border and CTA only, not on the whole card. */

const EASE = [0.22, 1, 0.36, 1] as const;

interface ComingGame {
  slug: 'roblox' | 'genshin' | 'bgmi';
  name: string;
  tagline: string;
  eta: string;
  detail: string;
  perks: string[];
  accent: string;
}

/* Roadmap cards — deliberately no published dates. Hard-coded "next
   week" or absolute dates become liabilities the moment a slip
   happens. Users can register on the per-game waitlist and we ping
   them when the marketplace flips live. */
const GAMES: ComingGame[] = [
  {
    slug: 'roblox',
    name: 'Roblox',
    tagline: 'Robux top-ups · rare item trades · accounts',
    eta: 'Waitlist open',
    detail: 'Get notified the moment the marketplace goes live.',
    perks: ['Robux top-ups', 'Limited & verified accounts', 'Sumsub-verified sellers'],
    accent: '#00A2FF',
  },
  {
    slug: 'genshin',
    name: 'Genshin Impact',
    tagline: 'Genesis crystals · resin · starter & whale accounts',
    eta: 'Waitlist open',
    detail: 'Get notified the moment the marketplace goes live.',
    perks: ['Genesis discount packs', 'Region-aware top-ups', 'Resin & primogem bundles'],
    accent: '#7A5AF8',
  },
  {
    slug: 'bgmi',
    name: 'BGMI',
    tagline: 'UC top-ups · M-coin · skin trades · accounts',
    eta: 'Waitlist open',
    detail: 'Get notified the moment the marketplace goes live.',
    perks: ['UC top-ups', 'Royale Pass bundles', 'Skin trading marketplace'],
    accent: '#F7A300',
  },
];

export function ComingSoonGames() {
  const reduce = useReducedMotion();

  return (
    <section
      id="roadmap"
      aria-label="Coming soon games"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28 bg-[hsl(var(--surface-elevated))]"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-6 flex-wrap mb-10 md:mb-14"
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
              <Sparkles className="h-3 w-3" />
              Roadmap · Phase 2
            </div>
            <h2 className="font-display font-extrabold leading-[0.92] tracking-[-0.025em] text-[clamp(2.25rem,5.5vw,4rem)] text-[hsl(var(--foreground))] mb-3">
              More games,
              <br />
              <span className="text-[hsl(var(--primary))]">on the way</span>.
            </h2>
            <p className="text-[15px] md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl">
              GETX launches with Pokémon GO. Roblox, Genshin Impact, and
              BGMI are onboarding next — drop your email on a card and
              we&apos;ll ping you the moment a marketplace goes live, with
              launch credits for waitlist members.
            </p>
          </div>
        </motion.div>

        {/* Live-now callout */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-8 md:mb-10 flex items-center gap-3 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--success)/0.4)] px-4 py-3.5 shadow-[0_1px_2px_hsl(0_0%_0%/0.05)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)]"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-70 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
          </span>
          <div className="flex-1 min-w-0 text-[13px] text-[hsl(var(--foreground))]">
            <span className="font-bold">Pokémon GO</span> is live now ·{' '}
            <span className="text-[hsl(var(--muted-foreground))]">240+ drops trading right now</span>
          </div>
          <Link
            href="/games/pokemon-go"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--success))] hover:underline shrink-0"
          >
            Browse <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>

        {/* 3 game cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {GAMES.map((g, i) => (
            <ComingSoonCard key={g.slug} game={g} index={i} />
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
          More games on the roadmap — Free Fire · Valorant · CODM · Honkai.{' '}
          <Link
            href="/games"
            className="text-[hsl(var(--primary))] hover:underline font-semibold"
          >
            See the full roadmap
          </Link>
        </div>
      </div>
    </section>
  );
}

function ComingSoonCard({ game, index }: { game: ComingGame; index: number }) {
  const reduce = useReducedMotion();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setError(null);
    try {
      const { api } = await import('@/lib/api');
      await api.post('/waitlist/game', { email, game: game.slug });
      setSubmitted(true);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not join the waitlist — try again in a moment.';
      setError(msg);
    }
  };

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: EASE }}
      className="relative rounded-3xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] hover:shadow-[0_8px_24px_hsl(var(--primary)/0.12)] hover:-translate-y-1 transition-all duration-ui p-6 md:p-7 overflow-hidden"
    >
      {/* Top accent stripe */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: game.accent }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${game.accent}15`,
              color: game.accent,
            }}
          >
            <Calendar className="h-3 w-3" />
            {game.eta}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground)/0.6)]">
            Phase 2
          </span>
        </div>

        <h3 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] mb-1.5 leading-tight">
          {game.name}
        </h3>
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] mb-3">
          {game.tagline}
        </p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground)/0.7)] mb-5">
          {game.detail}
        </p>

        <ul className="space-y-1.5 mb-6">
          {game.perks.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2 text-[12px] text-[hsl(var(--foreground)/0.85)]"
            >
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: game.accent }}
              />
              {p}
            </li>
          ))}
        </ul>

        {!submitted ? (
          <>
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 rounded-full bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] pl-4 pr-1 py-1 focus-within:border-[hsl(var(--primary))] transition-colors"
          >
            <Bell className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label={`Email for ${game.name} launch alert`}
              className="flex-1 bg-transparent outline-none text-[13px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.6)] min-w-0"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center h-8 px-3 rounded-full text-[11px] font-bold text-white shrink-0 transition-all hover:brightness-110"
              style={{ backgroundColor: game.accent }}
            >
              Notify
            </button>
          </form>
          {error ? (
            <p role="alert" className="mt-2 text-[11px] text-[hsl(var(--error))]">
              {error}
            </p>
          ) : null}
          </>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] text-[12px] font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            You&apos;re on the {game.name} waitlist
          </div>
        )}
      </div>
    </motion.article>
  );
}
