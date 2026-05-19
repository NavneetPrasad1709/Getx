'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { useListings, type TabType } from '@/hooks/use-listings';
import { OfferCard, OfferCardSkeleton } from './offer-card';

interface Props {
  tabType: TabType;
  eyebrow?: string;
  title: string;
  viewAllHref: string;
  limit?: number;
}

export function OfferRail({ tabType, eyebrow, title, viewAllHref, limit = 8 }: Props) {
  const reduce = useReducedMotion();
  const { data, isLoading } = useListings({
    gameSlug: 'pokemon-go',
    tabType,
    sort: 'popular',
    limit,
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
      aria-label={`${title} offers`}
      className="relative bg-black border-t border-border/60 py-14 md:py-20"
    >
      <div className="container">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            {eyebrow ? (
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-2">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(2rem,5vw,4rem)] text-white">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('prev')}
              aria-label={`Scroll ${title} left`}
              className="hidden md:inline-flex h-10 w-10 items-center justify-center border border-border/60 hover:border-primary hover:text-primary text-white/80 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('next')}
              aria-label={`Scroll ${title} right`}
              className="hidden md:inline-flex h-10 w-10 items-center justify-center border border-border/60 hover:border-primary hover:text-primary text-white/80 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary hairline-underline"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div
          ref={railRef}
          className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-2 px-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border"
        >
          {isLoading && listings.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} data-card className="snap-start shrink-0 w-[280px] md:w-[320px]">
                <OfferCardSkeleton />
              </div>
            ))
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
                transition={{ duration: 0.4, delay: 0.03 * Math.min(i, 6), ease: [0.22, 1, 0.36, 1] }}
                className="snap-start shrink-0 w-[280px] md:w-[320px]"
              >
                <OfferCard listing={l} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyRail() {
  return (
    <div className="w-full border border-dashed border-border/60 bg-[hsl(0_0%_4%)] p-10 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
        Fresh drops landing soon.
      </p>
    </div>
  );
}
