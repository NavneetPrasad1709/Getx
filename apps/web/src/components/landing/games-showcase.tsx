'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useGames, type Game } from '@/hooks/use-games';
import { InteractiveGameCard } from '@/components/ui/interactive-game-card';

/* Games showcase — premium showroom layout.
 *
 * Single warm radial light + film-grain texture replace the dual blob
 * lights (those read as 2023 AI-design cliché). Heading is bigger and
 * quieter. Live Pokémon GO card sits in its own row; a "Coming up"
 * mono divider separates it from the 3 coming-soon tiles below.
 */

interface ShowcaseGame {
  slug: string;
  name: string;
  art: string;
  tag: string;
  glowHue: number;
}

const COMING_SOON: ShowcaseGame[] = [
  { slug: 'roblox', name: 'Roblox', art: '/games/roblox/robolox.jpg', tag: 'In testing', glowHue: 0 },
  { slug: 'valorant', name: 'Valorant', art: '/games/valorant/valorant.jpg', tag: 'Q3 2026', glowHue: 350 },
  { slug: 'genshin', name: 'Genshin Impact', art: '/games/genshin/genshin.jpg', tag: 'Soon', glowHue: 195 },
];

function liveGame(games: Game[] | undefined): Game | null {
  if (!games) return null;
  return games.find((g) => g.slug === 'pokemon-go') ?? games.find((g) => g.isLaunched) ?? null;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function GamesShowcase() {
  const reduce = useReducedMotion();
  const { data: games } = useGames();
  const live = liveGame(games);

  return (
    <section
      aria-label="Games"
      className="relative isolate border-t border-border/40 py-20 md:py-24 overflow-hidden"
    >
      {/* Atmospheric layers — section-specific primary radial bloom on
          top of the page-level dotted bg. Hairlines mark the section
          edges. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--foreground)/0.15)] to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--foreground)/0.08)] to-transparent" />
      </div>

      <div className="container relative">
        {/* Heading — refined three-line stack */}
        <div className="flex items-end justify-between mb-10 md:mb-14 gap-6 flex-wrap">
          <div>
            <h2 className="font-display font-bold leading-[0.9] tracking-[-0.025em] text-[clamp(2.25rem,5vw,4rem)] text-foreground">
              Pick your{' '}
              <span className="italic font-light text-primary">game</span>.
            </h2>
          </div>
          <Link
            href="/games"
            className="
              group inline-flex items-center gap-2
              text-[12px] font-mono uppercase tracking-[0.22em] text-foreground/85
              hover:text-foreground transition-colors duration-200
              border-b border-foreground/15 hover:border-foreground/60 pb-1
            "
          >
            See all games
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* SINGLE-ROW GRID — all 4 cards share the same fixed height so
            they line up cleanly regardless of aspect or content length.
            Live spans 2 cols on lg; soon take 1 col each. */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 items-stretch">
          {/* Live tile */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="md:col-span-3 lg:col-span-2 h-[360px] md:h-[400px] lg:h-[440px]"
          >
            <InteractiveGameCard
              href={live ? `/games/${live.slug}` : '/games/pokemon-go'}
              imageUrl="/games/pokemon-go/pokemongo-game.webp"
              title={live?.name ?? 'Pokémon GO'}
              status="live"
              tag="Live now"
              metaPrimary={`${live?.totalListings ?? 240}+ listings`}
              metaSecondary={`${live?.totalSellers ?? 80}+ sellers`}
              aspect={false}
              className="h-full"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </motion.div>

          {/* Coming-soon tiles — same fixed height as the live tile */}
          {COMING_SOON.map((g, i) => (
            <motion.div
              key={g.slug}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.55,
                delay: 0.08 + 0.07 * i,
                ease: EASE,
              }}
              className="h-[360px] md:h-[400px] lg:h-[440px]"
            >
              <InteractiveGameCard
                href={`/games/${g.slug}/coming-soon`}
                imageUrl={g.art}
                title={g.name}
                status="soon"
                tag={g.tag}
                comingSoon
                aspect={false}
                className="h-full"
                sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 100vw"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
