'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/* LiveActivityTicker — slim FOMO strip directly under the hero.

   Eldorado calls these "recent purchases". A muted single-line scrolling
   ribbon tells visitors the marketplace is *alive* without competing
   with the hero or the marketplace section. Pure CSS marquee, no JS
   loops, no inputs. */

const ACTIVITY = [
  { who: 'Arjun M.', what: 'bought Lv 48 Valor · $306', when: '2 min ago' },
  { who: 'Priya S.', what: 'sold a PokéCoin top-up bundle', when: '4 min ago' },
  { who: 'Karan R.', what: 'hired a Master League booster', when: '7 min ago' },
  { who: 'Neha B.', what: 'bought 30 Raid Passes · $20', when: '9 min ago' },
  { who: 'Vikram J.', what: 'topped up 14,500 PokéCoins', when: '12 min ago' },
  { who: 'Ananya R.', what: 'bought Lv 45 Instinct · $156', when: '18 min ago' },
  { who: 'Rohan T.', what: 'sold Shiny Mewtwo trainer · $475', when: '22 min ago' },
  { who: 'Meera K.', what: 'topped up 3,500 PokéCoins · $14', when: '25 min ago' },
];

export function LiveActivityTicker() {
  return (
    <section
      aria-label="Live marketplace activity"
      className="relative px-4 sm:px-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-[1400px] flex items-center gap-3 rounded-full bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_2px_8px_hsl(0_0%_0%/0.06)] dark:shadow-[0_2px_8px_hsl(0_0%_0%/0.5)] py-2 pl-3 pr-2 overflow-hidden"
      >
        {/* Live chip — pinned left */}
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] text-[10px] font-bold uppercase tracking-wider">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-70 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
          </span>
          Live
        </span>

        {/* Scrolling track */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex animate-marquee whitespace-nowrap text-[12px] text-[hsl(var(--muted-foreground))] gap-8">
            {Array.from({ length: 3 }).map((_, k) => (
              <React.Fragment key={k}>
                {ACTIVITY.map((a, i) => (
                  <span key={`${k}-${i}`} className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
                    <span className="font-semibold text-[hsl(var(--foreground))]">{a.who}</span>
                    <span>{a.what}</span>
                    <span className="text-[hsl(var(--muted-foreground)/0.6)]">· {a.when}</span>
                    <span className="text-[hsl(var(--border))]">|</span>
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
          {/* Edge fade masks so the marquee bleeds out softly */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[hsl(var(--surface))] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[hsl(var(--surface))] to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
