'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from '@getx/ui';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Flame, Star } from 'lucide-react';
import { Badge, Button, Skeleton } from '@getx/ui';
import { useListings, type Listing } from '@/hooks/use-listings';
import { formatMoney } from '@/lib/currency';

/* Featured Listings — Apple "pinned" feel via a two-column section: the left
   column holds the sticky headline + nav controls; the right column is a
   horizontally snapping rail of cinematic listing cards.

   Why this layout vs. a grid: a grid hides the "store theatre". A horizontal
   rail forces the eye through each drop one at a time, which mirrors how
   Rockstar showcases hero products. */

export function FeaturedListings() {
  const reduce = useReducedMotion();
  const { data, isLoading } = useListings({
    gameSlug: 'pokemon-go',
    tabType: 'ACCOUNTS',
    sort: 'popular',
    limit: 8,
  });
  const listings = data?.data ?? [];

  const railRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: 'prev' | 'next') => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 24 : 360;
    rail.scrollBy({ left: dir === 'next' ? step : -step, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section
      aria-label="Featured drops"
      className="relative isolate overflow-hidden border-t border-border/40 py-24 md:py-32"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_30%,hsl(var(--primary)/0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_70%,hsl(var(--accent)/0.05),transparent_55%)]" />
      </div>

      <div className="container relative">
        <div className="grid lg:grid-cols-[420px_1fr] gap-10 lg:gap-12">
          {/* Sticky headline rail */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/[0.08] text-[10px] md:text-[11px] font-semibold tracking-[0.22em] uppercase">
                <Sparkles className="h-3 w-3 text-accent" />
                <span className="text-accent">Featured drops</span>
              </div>

              <h2 className="font-display font-bold leading-[0.95] tracking-[-0.035em] text-[clamp(2.25rem,5vw,4.5rem)] mb-5">
                Hand-picked.<br />
                <span className="gradient-text-cyan bg-[length:200%_100%] animate-shimmer">Hard to find.</span>
              </h2>

              <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-8 max-w-md">
                Curated weekly from our top-rated sellers. Every drop verified, escrow-protected, and instantly deliverable.
              </p>

              <div className="flex items-center gap-3">
                <Link href="/games/pokemon-go/accounts">
                  <Button variant="default" size="lg" className="rounded-full">
                    Browse all
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scroll('prev')}
                    aria-label="Previous drops"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur transition hover:border-primary/40 hover:text-primary"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scroll('next')}
                    aria-label="Next drops"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur transition hover:border-primary/40 hover:text-primary"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Horizontal rail */}
          <div
            ref={railRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-6 -mr-[calc(50vw-50%-1rem)] pr-[calc(50vw-50%-1rem)] lg:mr-0 lg:pr-0 scroll-smooth [scrollbar-width:thin]"
          >
            {isLoading && listings.length === 0 ? (
              <>
                <Skeleton className="h-[460px] w-[340px] shrink-0 rounded-3xl" />
                <Skeleton className="h-[460px] w-[340px] shrink-0 rounded-3xl" />
                <Skeleton className="h-[460px] w-[340px] shrink-0 rounded-3xl" />
              </>
            ) : listings.length === 0 ? (
              <EmptyRail />
            ) : (
              listings.map((l, i) => <FeaturedCard key={l.id} listing={l} index={i} reduce={!!reduce} />)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({ listing, index, reduce }: { listing: Listing; index: number; reduce: boolean }) {
  const cover = listing.images?.[0];
  const href = `/games/${listing.game.slug}/accounts/${listing.slug ?? listing.id}`;
  const discount = listing.discountPercent ?? null;
  const sellerName = listing.seller.username || listing.seller.name || 'Verified Seller';

  return (
    <motion.div
      data-card
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: 0.08 * Math.min(index, 4), ease: [0.22, 1, 0.36, 1] }}
      className="snap-start shrink-0 w-[300px] sm:w-[340px]"
    >
      <Link
        href={href}
        className="group block h-full rounded-3xl border border-border/60 bg-surface/70 backdrop-blur-xl overflow-hidden transition-all duration-ui ease-apple hover:-translate-y-2 hover:border-primary/40 hover:shadow-[0_30px_60px_-20px_hsl(var(--primary-glow)/0.4)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/10">
          {cover ? (
            <Image
              src={cover}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 340px, 80vw"
              className="object-cover transition-transform duration-section ease-apple group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {listing.isFeatured ? (
              <Badge variant="premium" size="sm">Featured</Badge>
            ) : null}
            {discount && discount >= 10 ? (
              <Badge variant="sale" size="sm">
                <Flame className="h-3 w-3" />
                -{discount}%
              </Badge>
            ) : null}
            {listing.seller.isVerified ? (
              <Badge variant="verified" size="sm">Verified</Badge>
            ) : null}
          </div>

          {/* Bottom gradient + seller */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-foreground/85">
              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
              <span className="font-semibold tabular-nums">{listing.seller.sellerRating.toFixed(1)}</span>
              <span className="text-foreground/55">· {sellerName}</span>
            </span>
            <span className="text-foreground/70 tabular-nums">{listing.soldCount} sold</span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 mb-3 text-foreground group-hover:text-primary transition-colors">
            {listing.title}
          </h3>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {formatMoney(listing.price, listing.currency)}
              </span>
              {listing.originalPrice && listing.originalPrice > listing.price ? (
                <span className="font-mono text-xs text-muted-foreground line-through tabular-nums">
                  {formatMoney(listing.originalPrice, listing.currency)}
                </span>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 translate-x-[-4px] transition-all duration-ui group-hover:opacity-100 group-hover:translate-x-0">
              View <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyRail() {
  return (
    <div className="w-full rounded-3xl border border-dashed border-border bg-surface/40 p-12 text-center">
      <p className="text-sm text-muted-foreground">Featured drops launching soon. Check back tomorrow.</p>
    </div>
  );
}
