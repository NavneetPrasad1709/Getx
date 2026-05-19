'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Star, Shield, Clock, Sparkles } from 'lucide-react';

/* FinalCTA — buyer-focused page closer.
 *
 * Was: generic "Trade smarter. Today." with duplicate trust pills and
 * a misleading 2-week roadmap line. Rewritten as a split-pane: pitch +
 * single CTA on the left, an auto-cycling sample-drop card on the
 * right that shows real-feeling marketplace activity. Visitor sees
 * exactly what they can buy in the next click.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const CYCLE_MS = 3200;

interface SampleDrop {
  title: string;
  tag: string;
  price: string;
  seller: string;
  rating: number;
  eta: string;
  /* Gradient seed for the card's image placeholder. */
  hue: number;
}

const SAMPLE_DROPS: SampleDrop[] = [
  {
    title: 'Lv 48 Instinct · 100% IV Garchomp',
    tag: 'Account',
    price: '$164',
    seller: '@rio',
    rating: 4.9,
    eta: '6 min',
    hue: 280,
  },
  {
    title: '4,500 PokéCoins · auto-deliver',
    tag: 'Top-up',
    price: '$22',
    seller: '@luca',
    rating: 5.0,
    eta: 'Instant',
    hue: 195,
  },
  {
    title: 'Great League rank push 2,100+',
    tag: 'Boosting',
    price: '$38',
    seller: '@aria',
    rating: 4.8,
    eta: '3 days',
    hue: 12,
  },
  {
    title: 'Lv 42 Mystic · Shiny haul (94)',
    tag: 'Account',
    price: '$148',
    seller: '@maya',
    rating: 4.9,
    eta: '12 min',
    hue: 158,
  },
];

export function FinalCTA() {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SAMPLE_DROPS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const current = SAMPLE_DROPS[index];

  return (
    <section
      aria-label="Get your first drop on GETX"
      className="relative isolate overflow-hidden py-20 md:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* AMBIENT — primary bloom + soft accent for warmth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_25%_30%,hsl(var(--primary)/0.14),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_85%_75%,hsl(var(--accent)/0.06),transparent_60%)]" />
      </div>

      <div className="container relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* LEFT — pitch + CTA */}
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-5 text-[11px] font-mono uppercase tracking-[0.28em] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                {!paused && !reduce ? (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                ) : null}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              </span>
              Ready when you are
            </div>

            <h2 className="font-display font-bold leading-[0.88] tracking-[-0.025em] text-[clamp(2.5rem,6vw,4.5rem)] text-foreground mb-5">
              Get your{' '}
              <span className="italic font-light text-primary">first drop</span>.
            </h2>

            <p className="text-[14.5px] md:text-[16px] text-muted-foreground max-w-md leading-relaxed mb-8">
              ID-verified Pokémon GO sellers, accounts, top-ups, items and
              boosting. Escrow on every order — full refund if anything is off.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
              <Link
                href="/games/pokemon-go/accounts"
                className="
                  group inline-flex items-center justify-center gap-2
                  h-12 px-7 rounded-full w-full sm:w-auto
                  bg-gradient-to-b from-primary to-primary-hover
                  text-primary-foreground text-[14px] font-bold tracking-tight
                  shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.25),inset_0_-2px_0_hsl(0_0%_0%/0.18)]
                  hover:-translate-y-px hover:from-primary-hover hover:to-primary
                  active:translate-y-0 active:shadow-[0_3px_10px_-2px_hsl(var(--primary)/0.40)]
                  transition-all duration-150
                "
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                Browse drops
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/register"
                className="
                  inline-flex items-center justify-center gap-1.5
                  h-12 px-5 rounded-full w-full sm:w-auto
                  text-[14px] font-semibold text-foreground/80
                  hover:text-foreground hover:bg-foreground/5
                  transition-all duration-150
                "
              >
                Create account first
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Trust line — operational guarantees only. Dropped "4.9
                avg seller rating" since there are no real ratings yet. */}
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-foreground/70">
              <li className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-success" />
                <span>3-day inspection window</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Same-day default delivery</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                <span>ID-verified sellers only</span>
              </li>
            </ul>
          </div>

          {/* RIGHT — auto-cycling sample drop card */}
          <div className="relative w-full max-w-md lg:max-w-none lg:justify-self-end">
            {/* Halo behind the card — pulls focus to the right side */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-[2.5rem] -z-10"
              style={{
                background: `radial-gradient(ellipse 60% 70% at 50% 50%, hsl(${current.hue} 90% 55% / 0.30), transparent 70%)`,
                filter: 'blur(40px)',
                transition: 'background 0.6s ease',
              }}
            />

            {/* "Sample preview" badge — clearly labels this card as a
                UI preview of what a drop looks like, not a fabricated
                live transaction. */}
            <motion.div
              className="
                absolute -top-3 left-6 z-20
                inline-flex items-center gap-1.5 rounded-full
                bg-foreground text-background
                px-3 py-1.5
                text-[10px] font-mono font-bold uppercase tracking-[0.22em]
                shadow-[0_6px_18px_-4px_hsl(0_0%_0%/0.35)]
              "
              animate={
                reduce
                  ? {}
                  : { y: [0, -3, 0], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-background" />
              Sample preview
            </motion.div>

            {/* The card itself */}
            <div
              className="
                relative rounded-3xl overflow-hidden
                bg-surface ring-1 ring-border
                shadow-[0_24px_60px_-20px_hsl(0_0%_0%/0.5)]
              "
            >
              {/* TOP — animated thumbnail area, color shifts per drop */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`thumb-${index}`}
                  initial={reduce ? false : { opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="relative aspect-[16/9]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${current.hue} 90% 30%) 0%, hsl(${(current.hue + 30) % 360} 90% 15%) 100%)`,
                  }}
                >
                  {/* Faint dot grid overlay */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  {/* Floating tag chip */}
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] font-mono font-semibold text-white">
                    {current.tag}
                  </div>
                  {/* ETA badge */}
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] font-mono font-semibold text-white">
                    <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                    {current.eta}
                  </div>
                  {/* Centered glyph — big white sparkle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={
                        reduce
                          ? {}
                          : { scale: [1, 1.15, 1], rotate: [0, 8, 0], transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }
                      }
                      className="text-white/85"
                    >
                      <Sparkles className="h-12 w-12" strokeWidth={1.5} />
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* BOTTOM — listing details */}
              <div className="p-5 md:p-6 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`info-${index}`}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <h3 className="font-display text-lg md:text-[19px] font-bold text-foreground leading-tight mb-3 line-clamp-1">
                      {current.title}
                    </h3>

                    <div className="flex items-center justify-between gap-3 mb-4">
                      {/* Seller */}
                      <div className="inline-flex items-center gap-2 min-w-0">
                        <div
                          className="h-7 w-7 rounded-full grid place-items-center text-white text-[10px] font-bold shrink-0"
                          style={{
                            background: `linear-gradient(135deg, hsl(${current.hue} 90% 50%), hsl(${(current.hue + 30) % 360} 90% 40%))`,
                          }}
                        >
                          {current.seller[1].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[12.5px] text-foreground truncate">
                            {current.seller}
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                            <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                            {current.rating}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="font-display font-extrabold tabular-nums text-xl md:text-2xl text-foreground leading-none">
                          {current.price}
                        </div>
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                          Escrowed
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Mini CTA on the card */}
                <Link
                  href="/games/pokemon-go/accounts"
                  className="
                    group flex items-center justify-between gap-2
                    rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08]
                    ring-1 ring-border hover:ring-foreground/20
                    px-4 py-3
                    transition-all duration-200
                  "
                >
                  <span className="text-[13px] font-semibold text-foreground">
                    Open listing
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Progress dots — show which sample is up */}
              <div className="absolute bottom-3 right-5 flex items-center gap-1">
                {SAMPLE_DROPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Show sample ${i + 1}`}
                    className={
                      i === index
                        ? 'h-1 w-4 rounded-full bg-primary'
                        : 'h-1 w-1 rounded-full bg-foreground/25 hover:bg-foreground/45'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
