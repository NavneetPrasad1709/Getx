'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, X } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { formatMoney } from '@/lib/currency';

/* RecentlyViewed — horizontal rail of last-N viewed products.

   Hidden until the user has at least 1 item in localStorage. Reads from
   useRecentlyViewed (which hydrates client-side, so we don't paint
   anything during SSR). The cards are intentionally smaller than the
   ProductRail cards — this is a "jump back in" affordance, not a sales
   rail. */

const EASE = [0.22, 1, 0.36, 1] as const;

export function RecentlyViewed() {
  const reduce = useReducedMotion();
  const railRef = React.useRef<HTMLDivElement>(null);
  const { items, hydrated, clear } = useRecentlyViewed();

  // Render nothing until we know what's in localStorage to avoid an
  // SSR hydration mismatch.
  if (!hydrated || items.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <section
      aria-label="Recently viewed"
      className="relative bg-[#0F0C26] text-white px-4 sm:px-6 lg:px-8 py-10 md:py-14 border-b border-white/8"
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45 }}
          className="flex items-end justify-between gap-4 mb-5"
        >
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 truncate">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--primary))] shrink-0" />
              Recently viewed
            </h2>
            <p className="mt-0.5 text-[11.5px] sm:text-[12px] text-white/55">
              Jump back into what caught your eye
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clear}
              className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-full text-[12px] font-semibold text-white/55 hover:text-white/85 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>

        <div
          ref={railRef}
          className="flex gap-3 overflow-x-auto pb-3 -mx-4 sm:-mx-0 px-4 sm:px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: EASE }}
              className="snap-start shrink-0 w-[160px] sm:w-[180px]"
            >
              <Link
                href={item.href}
                className="group block rounded-2xl overflow-hidden bg-white/[0.035] ring-1 ring-white/10 hover:ring-white/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative aspect-square overflow-hidden bg-black/40">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="180px"
                    loading="lazy"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <span
                    className="absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${item.gameAccent}26`,
                      color: item.gameAccent,
                      boxShadow: `inset 0 0 0 1px ${item.gameAccent}55`,
                    }}
                  >
                    {item.gameTag}
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-white/45 mb-0.5">
                    {item.category}
                  </div>
                  <div className="text-[12.5px] font-bold text-white leading-snug line-clamp-2 min-h-[2.4em] mb-2">
                    {item.title}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-base font-extrabold tabular-nums leading-none">
                      {formatMoney(item.price, 'USD')}
                    </span>
                    {item.was ? (
                      <span className="text-[10px] text-white/40 line-through tabular-nums">
                        {formatMoney(item.was, 'USD')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
