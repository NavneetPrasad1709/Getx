'use client';

import * as React from 'react';
import { motion, useReducedMotion } from '@getx/ui';
import { Activity, Banknote, Users, Boxes } from 'lucide-react';
import { useGames } from '@/hooks/use-games';
import { formatMoney, formatMoneyCompact } from '@/lib/currency';

/* Live Pulse Strip — sits directly under hero. Streams a live ticker of trades
   and surfaces three "right-now" counters. Numbers derive from the games endpoint
   we already cache, plus a deterministic-but-fresh "today" pulse so the strip
   never feels stale even on slow news days. */

const SAMPLE_TRADES = [
  { who: 'Aarav', what: 'Level 47 Mystic + 200 Shinies', price: 231 },
  { who: 'Priya', what: '14,500 PokéCoins top-up', price: 16 },
  { who: 'Rohan', what: 'Hundo Mewtwo + 3 Legendaries', price: 400 },
  { who: 'Sneha', what: 'Boost · Lvl 30 → 40', price: 56 },
  { who: 'Vikram', what: 'Lucky Trades pack (×50)', price: 28 },
  { who: 'Ayesha', what: 'Valor Lvl 50 · 320 Shinies', price: 562 },
  { who: 'Karthik', what: '5,200 PokéCoins top-up', price: 6 },
  { who: 'Ishaan', what: 'Shadow Raid bundle ×10', price: 48 },
];

export function LivePulseStrip() {
  const reduce = useReducedMotion();
  const { data: games } = useGames();

  const liveListings = games?.reduce((s, g) => s + (g.totalListings || 0), 0) ?? 1240;
  const liveSellers = games?.reduce((s, g) => s + (g.totalSellers || 0), 0) ?? 1204;

  // Derive a "today" pulse — deterministic per day so SSR/CSR agree.
  const today = new Date();
  const daySeed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
  const tradesToday = 280 + (daySeed % 180);
  const grossToday = 20_625 + (daySeed % 5_000);

  const stats = [
    { icon: Activity, label: 'Trades today', value: tradesToday.toLocaleString('en-US'), tone: 'text-primary' },
    { icon: Banknote, label: 'Moved today', value: formatMoneyCompact(grossToday, 'USD'), tone: 'text-success' },
    { icon: Users, label: 'Active sellers', value: liveSellers.toLocaleString('en-US'), tone: 'text-accent' },
    { icon: Boxes, label: 'Live listings', value: liveListings.toLocaleString('en-US'), tone: 'text-primary' },
  ];

  // Duplicate the trade list so the marquee loops seamlessly.
  const stream = [...SAMPLE_TRADES, ...SAMPLE_TRADES];

  return (
    <section
      aria-label="Live activity"
      className="relative isolate overflow-hidden border-y border-border/60 bg-black"
    >
      <div className="container relative py-8 md:py-10">
        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 md:gap-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-current/10 ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className={`font-display text-2xl md:text-3xl font-bold tracking-tight tabular-nums ${s.tone}`}>
                  {s.value}
                </div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Ticker — sharp, Rockstar-grade */}
        <div
          aria-label="Recent trades ticker"
          className="relative overflow-hidden border border-border/60 bg-[hsl(0_0%_4%)]"
        >
          {/* Live label */}
          <div className="absolute left-0 top-0 z-10 flex h-full items-center gap-2 px-4 bg-gradient-to-r from-[hsl(0_0%_4%)] via-[hsl(0_0%_4%)] to-transparent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hot opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-hot" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-hot font-bold">Live</span>
          </div>

          <div className="pl-24 pr-4 py-3">
            <div className={reduce ? 'flex flex-wrap gap-x-6 gap-y-2 text-sm' : 'flex animate-marquee gap-8 whitespace-nowrap text-sm'}>
              {stream.map((t, i) => (
                <span key={`${t.who}-${i}`} className="inline-flex items-center gap-2 text-white/75">
                  <span className="font-semibold text-white">{t.who}</span>
                  <span className="text-white/45 font-mono text-[10px] uppercase tracking-wider">grabbed</span>
                  <span>{t.what}</span>
                  <span className="font-mono text-primary tabular-nums font-bold">{formatMoney(t.price, 'USD')}</span>
                  <span aria-hidden className="text-border">·</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right fade */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-[hsl(0_0%_4%)] to-transparent" />
        </div>
      </div>
    </section>
  );
}
