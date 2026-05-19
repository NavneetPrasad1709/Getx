'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  Zap,
  Flame,
  Sparkles,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { Listing } from '@/hooks/use-listings';
import { SaveButton } from './save-button';
import { TopUpCover } from './top-up-cover';
import { formatMoney } from '@/lib/currency';

/* SmartImage — Next/Image with onError fallback chain.
   Listings often reference team-specific cover paths that haven't been
   uploaded yet, or seller-supplied URLs that 404. Without this wrapper
   the grid renders a row of broken-image icons. Here we walk down a
   list of candidate sources until one loads, then settle. */
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
        if (index < sources.length - 1) {
          setIndex(index + 1);
        }
      }}
      unoptimized
    />
  );
}

function tabSegment(tab: Listing['tabType']): string {
  if (tab === 'ACCOUNTS') return 'accounts';
  if (tab === 'TOP_UPS') return 'top-ups';
  return 'items';
}

function tabLabel(tab: Listing['tabType']): string {
  return tab === 'TOP_UPS' ? 'Top-up' : tab === 'ITEMS' ? 'Items' : 'Account';
}

/* Team-themed cover images — paths follow the convention
   /games/pokemon-go/teams/<team>.jpg. Falls back to the main game art
   if a team image is missing. Drop the actual images at these paths to
   light the cards up with the right brand color per account team. */
const TEAM_COVER: Record<string, string> = {
  Mystic: '/games/pokemon-go/teams/mystic.svg',
  Valor: '/games/pokemon-go/teams/valor.svg',
  Instinct: '/games/pokemon-go/teams/instinct.svg',
};

/* Hex per team — used for accent badge tint + soft gradient overlay so
   the card has a team identity even when the team image hasn't been
   uploaded yet. */
const TEAM_ACCENT: Record<string, string> = {
  Mystic: '#3B4CCA',
  Valor: '#FF1B1B',
  Instinct: '#FFCB05',
};

const ITEMS_COVER = '/games/pokemon-go/items-bundle.svg';
const ACCOUNT_FALLBACK = '/games/pokemon-go/pokemongo-game.webp';

interface Props {
  listing: Listing;
  hrefBase?: string;
  priority?: boolean;
}

export function ListingCard({ listing, hrefBase, priority = false }: Props) {
  const attrs = listing.attributes;
  const level = typeof attrs.level === 'number' ? attrs.level : null;
  const team = typeof attrs.team === 'string' ? attrs.team : null;
  const shiny = typeof attrs.shinyCount === 'number' ? attrs.shinyCount : null;
  const legendary = typeof attrs.legendaryCount === 'number' ? attrs.legendaryCount : null;
  const hundo = typeof attrs.hundoCount === 'number' ? attrs.hundoCount : null;
  const coinAmount = typeof attrs.coinAmount === 'string' ? attrs.coinAmount : null;

  const handle = listing.seller.username ?? listing.seller.name ?? 'seller';
  const base = hrefBase ?? `/games/${listing.game.slug}/${tabSegment(listing.tabType)}`;
  const href = listing.slug ? `${base}/${listing.slug}` : '#';
  const isAuto = listing.deliveryType === 'INSTANT' || listing.deliveryType === 'AUTO';
  const isHot = listing.soldCount >= 10;

  /* Pick ONE priority badge — no more stacking three chips top-left.
     Order: Discount > Hot > Featured. Quiet listings show nothing. */
  const priorityBadge: { label: string; icon: typeof Flame; tone: 'hot' | 'accent' } | null =
    listing.discountPercent
      ? { label: `-${listing.discountPercent}%`, icon: Flame, tone: 'hot' }
      : isHot
        ? { label: 'Hot', icon: Flame, tone: 'hot' }
        : listing.isFeatured
          ? { label: 'Featured', icon: Sparkles, tone: 'accent' }
          : null;

  /* Cover candidate chain — SmartImage walks down this list on 404.
     Always ends in the known-good fallback so we never show a broken
     image even if every higher-priority source is missing. */
  const coverCandidates = (() => {
    const list: string[] = [];
    if (listing.images?.[0]) list.push(listing.images[0]);
    if (listing.tabType === 'ITEMS') list.push(ITEMS_COVER);
    if (listing.tabType === 'ACCOUNTS' && team && TEAM_COVER[team]) {
      list.push(TEAM_COVER[team]);
    }
    list.push(ACCOUNT_FALLBACK);
    return list;
  })();

  const teamAccent = team && TEAM_ACCENT[team] ? TEAM_ACCENT[team] : null;

  return (
    <Link href={href} className="group block">
      <article className="relative h-full overflow-hidden rounded-2xl bg-surface ring-1 ring-border transition-all duration-200 hover:ring-foreground/25 hover:-translate-y-1 hover:shadow-[0_18px_40px_-14px_hsl(var(--primary)/0.25)]">
        {/* ── COVER IMAGE ──────────────────────────────────────────── */}
        <div
          className={`relative overflow-hidden bg-[#0a0a0c] ${
            listing.tabType === 'TOP_UPS' ? 'aspect-[7/5]' : 'aspect-[5/3]'
          }`}
        >
          {listing.tabType === 'TOP_UPS' ? (
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.05]">
              <TopUpCover coinAmount={coinAmount} />
            </div>
          ) : (
            <>
              <SmartImage
                sources={coverCandidates}
                alt={listing.title}
                sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
              {/* Bottom vignette for tag legibility */}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
              {/* Team-tinted accent stripe at the bottom — adds team
                  identity without dominating the artwork */}
              {teamAccent ? (
                <div
                  aria-hidden
                  className="absolute bottom-0 inset-x-0 h-[3px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${teamAccent}, transparent)`,
                  }}
                />
              ) : null}
            </>
          )}

          {/* TOP-LEFT — ONE priority badge max */}
          {priorityBadge ? (
            <div className="absolute top-3 left-3">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.18em] font-mono font-bold shadow-[0_4px_12px_-2px_rgb(0_0_0_/_0.35)] ${
                  priorityBadge.tone === 'hot'
                    ? 'bg-hot text-hot-foreground'
                    : 'bg-accent text-accent-foreground'
                }`}
              >
                <priorityBadge.icon className="h-2.5 w-2.5 fill-current" strokeWidth={2.5} />
                {priorityBadge.label}
              </span>
            </div>
          ) : null}

          {/* TOP-RIGHT — Save button only (Auto chip moved to footer) */}
          <div className="absolute top-3 right-3">
            <SaveButton listing={listing} size="sm" variant="overlay" />
          </div>

          {/* BOTTOM-LEFT — for accounts: Lv X · Team chip combo.
              For items: type label. Keeps the image area as the
              "summary" so the body section can stay short. */}
          {listing.tabType === 'ACCOUNTS' && (level !== null || team) ? (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-md ring-1 ring-white/15 px-2 py-1 text-[10.5px] font-mono font-bold text-white">
              {level !== null ? <span className="tabular-nums">Lv {level}</span> : null}
              {level !== null && team ? <span className="text-white/40">·</span> : null}
              {team ? (
                <span style={{ color: teamAccent ?? '#FFCB05' }}>{team}</span>
              ) : null}
            </div>
          ) : listing.tabType !== 'TOP_UPS' ? (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md ring-1 ring-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-white">
              <Zap className="h-2.5 w-2.5 fill-current text-primary" strokeWidth={2.5} />
              {tabLabel(listing.tabType)}
            </div>
          ) : null}

          {/* BOTTOM-RIGHT — auto-delivery badge (the one signal buyers
              care about more than 'Hot') */}
          {isAuto ? (
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-success/90 ring-1 ring-success/40 px-2 py-1 text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-success-foreground shadow-[0_4px_12px_-2px_hsl(var(--success)/0.4)]">
              <Zap className="h-2.5 w-2.5 fill-current" strokeWidth={2.5} />
              Auto
            </div>
          ) : null}
        </div>

        {/* ── BODY ─────────────────────────────────────────────────── */}
        <div className="p-4">
          {/* TITLE — single line. Buyers scan, they don't read paragraphs. */}
          {listing.tabType !== 'TOP_UPS' ? (
            <h3 className="font-display text-[15px] md:text-base font-bold leading-snug line-clamp-1 text-foreground group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
          ) : null}

          {/* HIGHLIGHT CHIPS — only the bragging numbers (shiny / legendary
              / hundo). Level + team are already on the image. Max 3 chips.
              Quiet listings (no shinies, no legendaries) show nothing. */}
          {listing.tabType === 'ACCOUNTS' && (shiny || legendary || hundo) ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hundo && hundo > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/15 text-success font-mono text-[10px] uppercase tracking-wider font-bold">
                  💯 {hundo}
                </span>
              ) : null}
              {shiny && shiny > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent font-mono text-[10px] uppercase tracking-wider font-bold">
                  ★ {shiny} shiny
                </span>
              ) : null}
              {legendary && legendary > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-hot/15 text-hot font-mono text-[10px] uppercase tracking-wider font-bold">
                  ⚡ {legendary} legendary
                </span>
              ) : null}
            </div>
          ) : null}

          {/* SELLER ROW — compact, on its own line so the eye can scan
              owner → rating without jumping between sections. */}
          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border/60">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 grid place-items-center text-[10px] font-mono font-bold text-primary-foreground shrink-0">
              {handle.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-[12px] font-mono text-muted-foreground truncate">
              @{handle}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-foreground/85">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="tabular-nums font-semibold">
                {listing.seller.sellerRating.toFixed(2)}
              </span>
            </span>
          </div>

          {/* PRICE + CTA — the only thing the buyer needs to commit. */}
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[22px] md:text-2xl font-extrabold tabular-nums text-foreground leading-none">
                {formatMoney(listing.price, listing.currency)}
              </span>
              {listing.originalPrice !== null ? (
                <span className="text-[12px] text-muted-foreground line-through tabular-nums">
                  {formatMoney(listing.originalPrice, listing.currency)}
                </span>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-primary/10 ring-1 ring-primary/30 text-primary text-[11.5px] font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary transition-colors">
              Buy now
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* ETA — tiny line under the row. One signal: how fast you get it. */}
          {listing.deliveryTime ? (
            <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" />
              {listing.deliveryTime}
            </div>
          ) : isAuto ? (
            <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-wider text-success font-bold">
              <Zap className="h-3 w-3" />
              Instant delivery
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
      <div className="aspect-[5/3] relative overflow-hidden bg-surface-elevated">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer bg-[length:200%_100%]" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-surface-elevated w-4/5" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded bg-surface-elevated" />
          <div className="h-5 w-16 rounded bg-surface-elevated" />
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-border/60">
          <div className="h-6 w-6 rounded-full bg-surface-elevated" />
          <div className="h-3 w-20 rounded bg-surface-elevated" />
          <div className="ml-auto h-3 w-10 rounded bg-surface-elevated" />
        </div>
        <div className="flex items-end justify-between pt-1">
          <div className="h-7 w-20 rounded bg-surface-elevated" />
          <div className="h-7 w-20 rounded-full bg-surface-elevated" />
        </div>
      </div>
    </div>
  );
}
