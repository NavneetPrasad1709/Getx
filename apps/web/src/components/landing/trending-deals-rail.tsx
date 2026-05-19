'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, ArrowUpRight, Flame, ShieldCheck, Zap } from 'lucide-react';
import { useListings, type Listing } from '@/hooks/use-listings';
import { formatMoney } from '@/lib/currency';

/* TrendingDealsRail — horizontal product carousel.

   This is the marketplace's most important surface. 8 trending listings in
   a scroll-snap rail; image + title + 3 stat chips + price + seller rating
   right where the buyer can scan it. */

function placeholderFor(listing: Listing): string {
  if (listing.tabType === 'TOP_UPS') return '/placeholders/listing-topups.svg';
  if (listing.tabType === 'ITEMS') return '/placeholders/listing-items.svg';
  return '/placeholders/listing-accounts.svg';
}

function hrefFor(listing: Listing): string {
  const tab =
    listing.tabType === 'TOP_UPS'
      ? 'top-ups'
      : listing.tabType === 'ITEMS'
        ? 'items'
        : 'accounts';
  const slug = listing.slug ?? listing.id;
  return `/games/${listing.game.slug}/${tab}/${slug}`;
}

export function TrendingDealsRail() {
  const reduce = useReducedMotion();
  const { data, isLoading } = useListings({
    gameSlug: 'pokemon-go',
    sort: 'popular',
    limit: 10,
  });
  const listings = data?.data ?? [];
  const railRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: 'prev' | 'next') => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 16 : 320;
    rail.scrollBy({ left: dir === 'next' ? step : -step, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section
      aria-label="Trending deals"
      className="relative bg-black border-t border-border/60 py-16 md:py-24"
    >
      <div className="container">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-2 inline-flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" />
              Trending now
            </div>
            <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(2rem,5vw,3.75rem)] text-white">
              Top-rated drops.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scroll('prev')}
              aria-label="Scroll trending left"
              className="hidden md:inline-flex h-10 w-10 items-center justify-center border border-border/60 hover:border-primary hover:text-primary text-white/80 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('next')}
              aria-label="Scroll trending right"
              className="hidden md:inline-flex h-10 w-10 items-center justify-center border border-border/60 hover:border-primary hover:text-primary text-white/80 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              href="/games/pokemon-go/accounts?sort=popular"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary hairline-underline"
            >
              View all
            </Link>
          </div>
        </div>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-2 px-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {isLoading && listings.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : listings.length === 0 ? (
            <EmptyRail />
          ) : (
            listings.map((l, i) => (
              <motion.div
                key={l.id}
                data-card
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: 0.03 * Math.min(i, 6), ease: [0.22, 1, 0.36, 1] }}
                className="snap-start shrink-0 w-[260px] sm:w-[280px]"
              >
                <DealCard listing={l} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DealCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0] ?? placeholderFor(listing);
  const attrs = listing.attributes;
  const level = typeof attrs.level === 'number' ? attrs.level : null;
  const shiny = typeof attrs.shinyCount === 'number' ? attrs.shinyCount : null;
  const team = typeof attrs.team === 'string' ? attrs.team : null;
  const isAuto = listing.deliveryType === 'INSTANT' || listing.deliveryType === 'AUTO';
  const sellerName = listing.seller.username ?? listing.seller.name ?? 'seller';
  const tier = listing.seller.verifiedTier;

  return (
    <Link
      href={hrefFor(listing)}
      className="group block h-full bg-[hsl(0_0%_5%)] border border-border/60 hover:border-primary transition-colors duration-ui ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[5/3] overflow-hidden bg-[hsl(0_0%_5%)]">
        <Image
          src={cover}
          alt={listing.title}
          fill
          sizes="(min-width: 640px) 280px, 70vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {listing.discountPercent && listing.discountPercent >= 10 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-hot text-hot-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              -{listing.discountPercent}%
            </span>
          ) : null}
          {listing.isFeatured ? (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-primary text-primary-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
              Featured
            </span>
          ) : null}
        </div>

        {/* Top-right auto badge */}
        {isAuto ? (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/85 text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
              <Zap className="h-2.5 w-2.5" />
              Auto
            </span>
          </div>
        ) : null}

        {/* Yellow corner accent */}
        <span
          aria-hidden
          className="absolute top-0 left-0 h-6 w-0 bg-primary transition-all duration-300 ease-out group-hover:w-6"
        />
      </div>

      <div className="p-3">
        <h3 className="font-display text-base font-bold uppercase tracking-tight text-white leading-tight line-clamp-2 min-h-[2.6rem] group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        {/* Stat row — only show what we have */}
        {level !== null || shiny !== null || team ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {level !== null ? (
              <span className="px-1.5 py-0.5 bg-[hsl(0_0%_10%)] text-primary font-mono text-[10px] uppercase tracking-wider">
                Lv {level}
              </span>
            ) : null}
            {team ? (
              <span className="px-1.5 py-0.5 bg-[hsl(0_0%_10%)] text-white/70 font-mono text-[10px] uppercase tracking-wider">
                {team}
              </span>
            ) : null}
            {shiny ? (
              <span className="px-1.5 py-0.5 bg-[hsl(0_0%_10%)] text-primary font-mono text-[10px] uppercase tracking-wider">
                ★ {shiny}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Seller row */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px]">
          <Star className="h-3 w-3 text-primary fill-primary" />
          <span className="text-white tabular-nums font-mono">
            {listing.seller.sellerRating.toFixed(2)}
          </span>
          <span className="text-white/45 truncate">@{sellerName}</span>
          {tier ? (
            <span className="ml-auto inline-flex items-center gap-0.5 text-primary">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          ) : null}
        </div>

        {/* Price row */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold text-white tabular-nums">
              {formatMoney(listing.price, listing.currency)}
            </span>
            {listing.originalPrice && listing.originalPrice > listing.price ? (
              <span className="font-mono text-[10px] text-white/45 line-through tabular-nums">
                {formatMoney(listing.originalPrice, listing.currency)}
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-0.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="snap-start shrink-0 w-[260px] sm:w-[280px] border border-border/60 bg-[hsl(0_0%_5%)]">
      <div className="aspect-[5/3] bg-[hsl(0_0%_8%)] animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-4/5 bg-[hsl(0_0%_10%)] animate-pulse" />
        <div className="h-3 w-3/5 bg-[hsl(0_0%_10%)] animate-pulse" />
        <div className="pt-3 border-t border-border/40 flex justify-between">
          <div className="h-5 w-20 bg-[hsl(0_0%_10%)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function EmptyRail() {
  return (
    <div className="w-full border border-dashed border-border/60 bg-[hsl(0_0%_4%)] p-10 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
        New drops landing soon — check back tomorrow.
      </p>
    </div>
  );
}
