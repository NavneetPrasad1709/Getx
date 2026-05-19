'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from '@getx/ui';
import { ArrowRight, Sparkles, Clock, Shield, ChevronRight } from 'lucide-react';
import { Header } from '@/components/header';
import { useGame } from '@/hooks/use-games';
import { FloatingCTA } from '@/components/custom-request/floating-cta';

/* Per-service cover images. The boosting catalog comes from the game's
   fieldsConfig and the service names vary, so we match by keyword to
   pick the right thematic art. SmartImage walks the candidate chain
   and always lands on the main game cover as a guaranteed fallback. */
const BOOSTING_FALLBACK = '/games/pokemon-go/pokemongo-game.webp';

function coverFor(name: string): string[] {
  const n = name.toLowerCase();
  const candidates: string[] = [];
  if (n.includes('raid')) candidates.push('/games/pokemon-go/boosting/raid.svg');
  if (n.includes('rank') || n.includes('league') || n.includes('push'))
    candidates.push('/games/pokemon-go/boosting/rank.svg');
  if (n.includes('xp') || n.includes('level'))
    candidates.push('/games/pokemon-go/boosting/xp.svg');
  if (n.includes('stardust') || n.includes('dust'))
    candidates.push('/games/pokemon-go/boosting/stardust.svg');
  if (n.includes('shiny'))
    candidates.push('/games/pokemon-go/boosting/shiny.svg');
  if (n.includes('legendary') || n.includes('catch'))
    candidates.push('/games/pokemon-go/boosting/legendary.svg');
  candidates.push('/games/pokemon-go/boosting/generic.svg', BOOSTING_FALLBACK);
  return candidates;
}

function SmartImage({
  sources,
  alt,
  sizes,
  className,
}: {
  sources: string[];
  alt: string;
  sizes: string;
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
      unoptimized
      onError={() => {
        if (index < sources.length - 1) setIndex(index + 1);
      }}
      className={className}
    />
  );
}

interface BoostingService {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  estimatedTime?: string;
}
interface ReverseTab {
  type?: string;
  subServices?: BoostingService[];
}
interface FieldsConfig {
  tabs?: ReverseTab[];
}
interface GamePayload {
  fieldsConfig?: FieldsConfig;
}

export default function BoostingHubPage() {
  const { data, isLoading } = useGame('pokemon-go');
  const game = data as GamePayload | undefined;

  const boostingTab = game?.fieldsConfig?.tabs?.find((t) => t.type === 'REVERSE');
  const services = boostingTab?.subServices ?? [];

  return (
    /* Single-viewport layout on desktop — header + main fit within
       100svh so the buyer never scrolls to see all services. Mobile
       allows natural scroll only if a tall phone with many services
       genuinely can't fit; the grid stays compact regardless. */
    <div className="min-h-[100svh] lg:h-[100svh] flex flex-col bg-background lg:overflow-hidden">
      <Header />

      <main className="flex-1 min-h-0 flex flex-col container py-4 md:py-6">
        {/* COMPACT TITLE STRIP — breadcrumb + heading + 1-line subtitle */}
        <div className="mb-4 md:mb-5 shrink-0">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground mb-2"
          >
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/games/pokemon-go" className="hover:text-foreground transition-colors">Pokémon GO</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Boosting</span>
          </nav>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold tracking-tight leading-[1] text-foreground">
                Boosting · <span className="text-primary">Reverse bid</span>
              </h1>
              <p className="text-[12.5px] md:text-[13px] text-muted-foreground mt-1">
                Pick a service · sellers bid · escrow until done.
              </p>
            </div>
            <Link
              href="/requests/new"
              className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary border-b border-primary/30 hover:border-primary pb-0.5 transition-all"
            >
              Open requests
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* DENSE SERVICE GRID — fills the remaining viewport. Tiles are
            compact horizontal cards (thumb left, name + ETA right) so
            6-8 services fit without any scrolling. */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 h-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-surface-elevated/40 animate-pulse"
                />
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-fr">
              {services.map((service, i) => (
                <ServiceTile key={service.slug} service={service} index={i} />
              ))}
            </div>
          ) : (
            <div className="h-full grid place-items-center">
              <div className="text-center max-w-sm">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Boosting services launching with the next patch. Add your
                  name to the waitlist on Discord.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <FloatingCTA gameSlug="pokemon-go" tabType="BOOSTING" />
    </div>
  );
}

/* Compact horizontal service tile — image (left, square thumb) + content
   (right: name, optional description, ETA + CTA row). Keeps the page
   dense so 6-8 services fit on one viewport without scroll. */
function ServiceTile({ service, index }: { service: BoostingService; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="h-full"
    >
      <Link
        href={`/games/pokemon-go/boosting/${service.slug}`}
        className="group flex h-full overflow-hidden rounded-xl bg-surface ring-1 ring-border hover:ring-foreground/30 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_hsl(var(--primary)/0.25)] transition-all duration-200"
      >
        {/* LEFT — square thumbnail, ~96px on the smallest tiles */}
        <div className="relative w-[96px] sm:w-[110px] shrink-0 overflow-hidden bg-[#0a0a0c]">
          <SmartImage
            sources={coverFor(service.name)}
            alt={service.name}
            sizes="110px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          {/* Faint right-edge fade so text doesn't fight the image */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[hsl(var(--surface))] to-transparent"
          />
        </div>

        {/* RIGHT — content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
          <div>
            <h3 className="font-display text-[14px] font-bold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {service.name}
            </h3>
            {service.description ? (
              <p className="mt-1 text-[11.5px] text-muted-foreground leading-snug line-clamp-2">
                {service.description}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              {service.estimatedTime ? (
                <span className="inline-flex items-center gap-1 text-foreground/85 font-bold tabular-nums">
                  <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {service.estimatedTime}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-success font-bold">
                <Shield className="h-2.5 w-2.5" strokeWidth={2.5} />
                Escrow
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
              Get offers
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
