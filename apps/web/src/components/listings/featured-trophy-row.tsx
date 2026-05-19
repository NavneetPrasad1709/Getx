'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from '@getx/ui';
import { Badge, Button } from '@getx/ui';
import { Crown, ArrowRight, Star, Flame, Zap, ShieldCheck } from 'lucide-react';
import { useListings, type Listing } from '@/hooks/use-listings';
import { formatMoney } from '@/lib/currency';

/* FeaturedTrophyRow — the cinematic "drop of the day" at the top of any
   browse page. Picks the highest-scoring featured listing for the supplied
   game/tab and presents it as a 2-column hero card with art on one side and
   stats + a "Snag it" CTA on the other.

   Returns null silently when no featured listing exists, so it's safe to
   place above any grid. */

interface Props {
  gameSlug: string;
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
  hrefBase: string;
}

export function FeaturedTrophyRow({ gameSlug, tabType, hrefBase }: Props) {
  const reduce = useReducedMotion();
  const { data, isLoading } = useListings({ gameSlug, tabType, sort: 'popular', limit: 6 });

  // First featured listing wins. Fall back to the most-popular non-featured if none flagged.
  const trophy = React.useMemo<Listing | undefined>(() => {
    if (!data?.data?.length) return undefined;
    return data.data.find((l) => l.isFeatured) ?? data.data[0];
  }, [data]);

  if (isLoading) {
    return (
      <div className="mb-8 h-[340px] md:h-[280px] rounded-3xl border border-border/40 bg-surface-elevated/40 animate-pulse" />
    );
  }

  if (!trophy) return null;

  const cover = trophy.images?.[0];
  const href = trophy.slug ? `${hrefBase}/${trophy.slug}` : '#';
  const sellerName = trophy.seller.username || trophy.seller.name || 'Verified Seller';
  const attrs = trophy.attributes;
  const level = typeof attrs.level === 'number' ? attrs.level : null;
  const shiny = typeof attrs.shinyCount === 'number' ? attrs.shinyCount : null;
  const legendary = typeof attrs.legendaryCount === 'number' ? attrs.legendaryCount : null;
  const hundo = typeof attrs.hundoCount === 'number' ? attrs.hundoCount : null;
  const team = typeof attrs.team === 'string' ? attrs.team : null;
  const isAuto = trophy.deliveryType === 'INSTANT' || trophy.deliveryType === 'AUTO';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8"
    >
      <Link
        href={href}
        className="group block surface-cinematic rounded-3xl overflow-hidden"
      >
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          {/* Art */}
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[300px] overflow-hidden bg-gradient-to-br from-primary/20 via-surface to-accent/15">
            {cover ? (
              <Image
                src={cover}
                alt={trophy.title}
                fill
                sizes="(min-width: 768px) 55vw, 100vw"
                priority
                className="object-cover transition-transform duration-section ease-apple group-hover:scale-[1.04]"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <Crown className="h-24 w-24 text-foreground/15" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
              <Badge variant="premium" size="md">
                <Crown className="h-3 w-3" />
                Trophy drop
              </Badge>
              {trophy.discountPercent && trophy.discountPercent >= 10 ? (
                <Badge variant="sale" size="md">
                  <Flame className="h-3 w-3" />
                  -{trophy.discountPercent}%
                </Badge>
              ) : null}
            </div>

            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/95 via-background/30 to-transparent md:hidden" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent hidden md:block" />
          </div>

          {/* Content */}
          <div className="relative p-6 md:p-8 lg:p-10 flex flex-col">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-3">
              Pick of the day
            </div>

            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-3 group-hover:text-primary transition-colors">
              {trophy.title}
            </h2>

            {/* Stat chips */}
            {(level !== null || shiny !== null || legendary !== null || hundo !== null) ? (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {level !== null ? (
                  <span className="px-2.5 py-1 rounded-md bg-primary/15 text-primary font-mono text-[10px] uppercase tracking-wider">
                    Lvl {level}
                  </span>
                ) : null}
                {team ? (
                  <span className="px-2.5 py-1 rounded-md bg-surface-elevated text-foreground/75 font-mono text-[10px] uppercase tracking-wider">
                    {team}
                  </span>
                ) : null}
                {shiny ? (
                  <span className="px-2.5 py-1 rounded-md bg-accent/15 text-accent font-mono text-[10px] uppercase tracking-wider">
                    ★ {shiny} shinies
                  </span>
                ) : null}
                {legendary ? (
                  <span className="px-2.5 py-1 rounded-md bg-hot/15 text-hot font-mono text-[10px] uppercase tracking-wider">
                    {legendary} legendaries
                  </span>
                ) : null}
                {hundo ? (
                  <span className="px-2.5 py-1 rounded-md bg-success/15 text-success font-mono text-[10px] uppercase tracking-wider">
                    100% × {hundo}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Seller bar */}
            <div className="flex items-center gap-2 mb-6 text-xs text-foreground/80">
              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
              <span className="font-semibold tabular-nums">
                {trophy.seller.sellerRating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({trophy.seller.totalSales}) · {sellerName}
              </span>
              {trophy.seller.isVerified ? (
                <span className="inline-flex items-center gap-1 text-success">
                  · <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : null}
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Snag for
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl md:text-4xl font-bold tabular-nums">
                    {formatMoney(trophy.price, trophy.currency)}
                  </span>
                  {trophy.originalPrice && trophy.originalPrice > trophy.price ? (
                    <span className="text-sm text-muted-foreground line-through tabular-nums">
                      {formatMoney(trophy.originalPrice, trophy.currency)}
                    </span>
                  ) : null}
                </div>
                {isAuto ? (
                  <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                    <Zap className="h-3 w-3" /> Instant delivery
                  </div>
                ) : null}
              </div>

              <Button variant="premium" size="lg" className="rounded-full shrink-0">
                Snag it
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
