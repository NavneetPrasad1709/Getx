'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from '@getx/ui';
import { ArrowRight, Sparkles, Zap, Users } from 'lucide-react';
import { useGames, type Game } from '@/hooks/use-games';

const FALLBACK_GAMES: Game[] = [
  {
    id: 'fb-pogo', slug: 'pokemon-go', name: 'Pokémon GO', shortName: 'PoGo',
    description: 'Accounts, top-ups, items and boosting. Region teams, hundos, raid pulls.',
    icon: '', banner: null, isLaunched: true, comingSoonAt: null,
    totalListings: 480, totalSellers: 62, sortOrder: 1,
  },
  {
    id: 'fb-roblox', slug: 'roblox', name: 'Roblox', shortName: 'RBX',
    description: 'Robux, limiteds, account services. Coming next.',
    icon: '', banner: null, isLaunched: false, comingSoonAt: '2026-07-01',
    totalListings: 0, totalSellers: 0, sortOrder: 2,
  },
  {
    id: 'fb-valorant', slug: 'valorant', name: 'Valorant', shortName: 'VAL',
    description: 'Ranked accounts, Vanguard-safe boosting, skin trades.',
    icon: '', banner: null, isLaunched: false, comingSoonAt: null,
    totalListings: 0, totalSellers: 0, sortOrder: 3,
  },
  {
    id: 'fb-cod', slug: 'cod-mobile', name: 'COD: Mobile', shortName: 'COD',
    description: 'CP top-ups, ranked accounts, custom loadouts.',
    icon: '', banner: null, isLaunched: false, comingSoonAt: null,
    totalListings: 0, totalSellers: 0, sortOrder: 4,
  },
  {
    id: 'fb-genshin', slug: 'genshin-impact', name: 'Genshin', shortName: 'GI',
    description: 'AR55+ accounts, Genesis Crystals, reroll services.',
    icon: '', banner: null, isLaunched: false, comingSoonAt: null,
    totalListings: 0, totalSellers: 0, sortOrder: 5,
  },
  {
    id: 'fb-bgmi', slug: 'bgmi', name: 'BGMI', shortName: 'BGMI',
    description: 'UC top-ups, Conqueror push, account trades.',
    icon: '', banner: null, isLaunched: false, comingSoonAt: null,
    totalListings: 0, totalSellers: 0, sortOrder: 6,
  },
];

/* Cover image candidates per game slug. SmartImage walks down the list
   until one loads; the last entry is always the known-good Pokémon GO
   art so we never render a broken card while you backfill assets. */
const GAME_COVERS: Record<string, string[]> = {
  'pokemon-go': ['/games/pokemon-go/pokemongo-game.webp'],
  roblox: ['/games/roblox/robolox.jpg'],
  valorant: ['/games/valorant/valorant.jpg'],
  'genshin-impact': ['/games/genshin/genshin.jpg'],
  'cod-mobile': ['/games/cod-mobile/cover.svg'],
  bgmi: ['/games/bgmi/cover.svg'],
};
const COVER_FALLBACK = '/games/pokemon-go/pokemongo-game.webp';

function coversFor(slug: string): string[] {
  return [...(GAME_COVERS[slug] ?? []), COVER_FALLBACK];
}

/* SmartImage — onError fallback chain so missing covers never render
   a broken-image icon. Walks down candidates, settles on first that
   loads. `unoptimized` so Next's pipeline doesn't intercept 404s. */
function SmartImage({
  sources,
  alt,
  sizes,
  priority,
  className,
}: {
  sources: string[];
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const src = sources[Math.min(index, sources.length - 1)];

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (index < sources.length - 1) setIndex(index + 1);
      }}
      unoptimized
    />
  );
}

function GameCard({ game, index }: { game: Game; index: number }) {
  const isLive = game.isLaunched;
  const href = isLive ? `/games/${game.slug}` : '#';

  const inner = (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`
        relative h-full overflow-hidden rounded-2xl
        bg-surface ring-1 ring-border
        transition-all duration-200
        ${isLive ? 'group-hover:ring-foreground/30 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-14px_hsl(var(--primary)/0.25)]' : 'opacity-80'}
      `}
    >
      {/* COVER */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0a0a0c]">
        <SmartImage
          sources={coversFor(game.slug)}
          alt={game.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={`object-cover transition-transform duration-500 ${
            isLive ? 'group-hover:scale-[1.05]' : 'grayscale-[0.4]'
          }`}
        />
        {/* Vignettes for badge contrast */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />

        {/* Status badge — top-left */}
        <div className="absolute top-3 left-3">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 bg-success/90 ring-1 ring-success/40 text-success-foreground text-[10px] uppercase tracking-[0.18em] font-mono font-bold shadow-[0_4px_12px_-2px_hsl(var(--success)/0.4)]">
              <span className="h-1.5 w-1.5 rounded-full bg-success-foreground animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-black/55 backdrop-blur-md ring-1 ring-white/20 text-white text-[10px] uppercase tracking-[0.18em] font-mono font-bold">
              Coming soon
            </span>
          )}
        </div>

        {/* Catalog number — top-right, subtle */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-md px-2 py-1 bg-black/40 backdrop-blur-md text-white/85 text-[9.5px] uppercase tracking-[0.18em] font-mono font-bold">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Game name baked on the image bottom — big editorial title */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-2xl md:text-[26px] font-extrabold tracking-tight leading-tight text-white [text-shadow:0_3px_18px_rgb(0_0_0_/_0.6)]">
            {game.name}
          </h3>
        </div>
      </div>

      {/* BODY */}
      <div className="p-4">
        {game.description ? (
          <p className="text-[12.5px] text-foreground/75 leading-relaxed line-clamp-2 min-h-[2.6em]">
            {game.description}
          </p>
        ) : null}

        {isLive ? (
          <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-4 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" strokeWidth={2.5} />
                <span className="tabular-nums text-foreground font-bold">
                  {game.totalListings}
                </span>
                <span>listings</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" strokeWidth={2.5} />
                <span className="tabular-nums text-foreground font-bold">
                  {game.totalSellers}
                </span>
                <span>sellers</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-primary/10 ring-1 ring-primary/30 text-primary text-[11px] font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary transition-colors">
              Open
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 pt-3 border-t border-border/60 text-[11.5px] text-foreground/70 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            <span>Vote on Discord for launch priority</span>
          </div>
        )}
      </div>
    </motion.article>
  );

  return isLive ? (
    <Link href={href} className="group block h-full">
      {inner}
    </Link>
  ) : (
    <div className="block h-full" aria-disabled>
      {inner}
    </div>
  );
}

export function GamesGrid() {
  const { data: live } = useGames();
  const games = live && live.length > 0 ? live : FALLBACK_GAMES;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {games.map((g, i) => (
        <GameCard key={g.id} game={g} index={i} />
      ))}

      {/* "Your game next?" closing tile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: games.length * 0.05 }}
        className="relative rounded-2xl border-2 border-dashed border-border/60 bg-surface/30 backdrop-blur p-6 min-h-[300px] flex flex-col items-center justify-center text-center"
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-display text-lg font-bold mb-2 text-foreground">
          Your game next?
        </h3>
        <p className="text-[13px] text-muted-foreground mb-4 max-w-xs leading-relaxed">
          Vote on Discord. Top-3 ships next quarter.
        </p>
        <a
          href="https://discord.gg/getx"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-primary font-bold hover:underline"
        >
          Join the vote
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </motion.div>
    </div>
  );
}
