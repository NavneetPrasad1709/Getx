'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';

/* TrendingGames — horizontal carousel of game cards.

   Mirrors ZeusX's "Trending Games" rail. Each card is a square image
   with the game title underneath. Pokémon GO sits live, the rest carry
   "Coming soon" overlays. Native horizontal scroll on mobile, prev/next
   buttons drive scrollLeft on desktop. */

const EASE = [0.22, 1, 0.36, 1] as const;

interface Game {
  slug: string;
  name: string;
  href: string;
  art: string;
  live?: boolean;
  eta?: string;
  accent: string;
}

/* Game roster — Pokémon GO is the only LIVE marketplace. Everything
   else is roadmap; we surface them as "Waitlist" so users can register
   interest, but we deliberately do NOT publish dates. Memory:
   project_pokemon_go_focus — "Drop dense catalog, use slim coming-soon
   strip". */
const GAMES: Game[] = [
  {
    slug: 'pokemon-go',
    name: 'Pokémon GO',
    href: '/games/pokemon-go',
    art: '/games/pokemon-go/hero.svg',
    live: true,
    accent: 'hsl(var(--primary))',
  },
  {
    slug: 'roblox',
    name: 'Roblox',
    href: '/games?coming=roblox',
    art: '/categories/accounts.svg',
    eta: 'Waitlist',
    accent: '#00A2FF',
  },
  {
    slug: 'genshin',
    name: 'Genshin Impact',
    href: '/games?coming=genshin',
    art: '/categories/items.svg',
    eta: 'Waitlist',
    accent: '#7A5AF8',
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    href: '/games?coming=valorant',
    art: '/categories/boosting.svg',
    eta: 'Waitlist',
    accent: '#FF4655',
  },
];

export function TrendingGames() {
  const reduce = useReducedMotion();
  const railRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <section
      aria-label="Trending games"
      className="relative bg-[#14102B] text-white px-4 sm:px-6 lg:px-8 py-14 md:py-20"
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-4 mb-6 md:mb-8"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Trending Games
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        <div
          ref={railRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 sm:-mx-0 px-4 sm:px-0 snap-x snap-mandatory scrollbar-thin"
          style={{ scrollbarWidth: 'thin' }}
        >
          {GAMES.map((g, i) => (
            <motion.div
              key={g.slug}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: EASE }}
              className="snap-start shrink-0 w-[180px] sm:w-[210px] md:w-[230px]"
            >
              <GameCard game={g} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={game.href}
      className="group block rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/30 transition-all"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={game.art}
          alt={game.name}
          fill
          sizes="(min-width: 1024px) 230px, 210px"
          loading="lazy"
          className={`object-cover transition-all duration-500 ${
            game.live ? 'opacity-100 group-hover:scale-[1.04]' : 'opacity-80 grayscale-[60%] group-hover:grayscale-0'
          }`}
        />
        {/* Accent corner */}
        <div
          aria-hidden
          className="absolute top-3 left-3 h-1 w-10 rounded-full"
          style={{ backgroundColor: game.accent }}
        />

        {/* Status chip */}
        {game.live ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        ) : (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-white/85 text-[10px] font-bold uppercase tracking-wider">
            <Lock className="h-2.5 w-2.5" />
            {game.eta}
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <div className="font-display text-[15px] font-extrabold tracking-tight truncate">
          {game.name}
        </div>
      </div>
    </Link>
  );
}
