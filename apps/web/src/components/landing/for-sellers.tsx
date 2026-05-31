'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  Wallet,
  Headphones,
  Sparkles,
  Star,
  Check,
} from 'lucide-react';

/* For-sellers — pitch + benefits + earnings preview + CTAs.
 *
 * Reworked to read in 5 seconds: each benefit leads with a hard metric
 * (40K / 24h / +28% / <1h) so the visitor's eye lands on numbers
 * before words. A small "live seller" card on the right anchors the
 * abstract promise — "this could be you, here's an actual seller
 * making it work." CTAs are a primary pill + ghost text link.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* Replaced fake stats ("40K+ buyers/week", "+28% avg price uplift")
   with operational promises that hold up at launch. Counts will land
   back once they're real and verifiable. */
const BENEFITS = [
  {
    icon: TrendingUp,
    metric: '0%',
    metricLabel: 'paid-ad cost',
    title: 'Built-in distribution',
    body: 'Listings surface in every buyer search across GetX. No paid ads, no SEO grind, no ratings reset.',
  },
  {
    icon: Wallet,
    metric: '24h',
    metricLabel: 'payout window',
    title: 'Get paid fast',
    body: 'Settlement via Stripe, PayPal, Wise, or local bank rails within 24 hours of buyer confirmation.',
  },
  {
    icon: Sparkles,
    metric: 'PRO',
    metricLabel: 'tier perks',
    title: 'Tier-based ranking',
    body: 'PRO and Elite sellers surface above the fold and unlock priority placement in category pages.',
  },
  {
    icon: Headphones,
    metric: '<1h',
    metricLabel: 'dispute response',
    title: 'Real humans, 24/7',
    body: 'Seller success team escalates disputes in under an hour. No bot runaround.',
  },
] as const;

const HOW_IT_WORKS = [
  'Sign up & verify in 5 min',
  'List your first drop free',
  'Get paid the moment buyer confirms',
];

export function ForSellers() {
  const reduce = useReducedMotion();
  // FUNC-004: fall back to the same-origin /sell redirect (web next.config maps
  // it to the seller origin), never a dead localhost link in production.
  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || '/sell';

  return (
    <section
      aria-label="Sell on GETX"
      className="relative isolate overflow-hidden py-20 md:py-24"
    >
      {/* AMBIENT BACKDROP — soft accent (gold) bloom because this section
          is about earning, distinct from the primary blue used elsewhere. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_30%,hsl(var(--accent)/0.10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_85%_80%,hsl(var(--primary)/0.06),transparent_60%)]" />
      </div>

      <div className="container relative">
        {/* TOP — heading on the left, mini "live seller" card on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-start mb-12 md:mb-14">
          <div className="space-y-4">
            <h2 className="font-display font-bold leading-[0.9] tracking-[-0.025em] text-[clamp(2.25rem,5vw,4rem)] text-foreground">
              Turn the grind into{' '}
              <span className="italic font-light text-primary">income</span>.
            </h2>
            <p className="text-[14.5px] md:text-[16px] text-muted-foreground max-w-xl leading-relaxed">
              GETX brings buyers, handles trust, and pays out in 24 hours.
              You ship the goods — that&apos;s it.
            </p>

            {/* Mini 3-step ribbon — sets expectation, lowers friction */}
            <ul className="pt-2 flex flex-col sm:flex-row gap-x-5 gap-y-2 text-[12.5px] text-foreground/85">
              {HOW_IT_WORKS.map((step) => (
                <li key={step} className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15 text-success shrink-0">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* SELLER PROOF CARD — small mock card showing a real-feeling
              top-seller. Visitor projects themselves into it. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
            className="
              relative rounded-2xl overflow-hidden
              bg-surface ring-1 ring-border
              p-5 md:p-6
              shadow-[0_8px_24px_-12px_hsl(var(--accent)/0.30)]
            "
          >
            {/* "Sample preview" tag — replaces the fake "Live" pulse so
                this clearly reads as a UX preview of a seller profile,
                not a fabricated testimonial. */}
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] ring-1 ring-border px-2 py-1 text-[9.5px] font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Sample preview
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="
                  h-11 w-11 rounded-full grid place-items-center
                  bg-gradient-to-br from-accent to-accent-hover
                  text-accent-foreground font-bold text-sm
                  ring-2 ring-accent/20
                "
              >
                P
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground text-[14px]">@priya.s</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-[9.5px] font-bold uppercase tracking-wider">
                    <Star className="h-2 w-2 fill-current" />
                    PRO
                  </span>
                </div>
                <div className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  PRO tier · Verified seller
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-success/12 to-success/4 ring-1 ring-success/20 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-success/85 mb-1">
                Projected monthly payout
              </div>
              <div className="font-display text-2xl md:text-[28px] font-extrabold text-foreground tabular-nums leading-none">
                $1,500+
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-success font-semibold">
                <TrendingUp className="h-3 w-3" />
                Top-quartile PRO sellers
              </div>
            </div>
          </motion.div>
        </div>

        {/* BENEFITS — 4 metric-led cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-12">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: 0.06 * i, ease: EASE }}
              className="
                group relative rounded-2xl
                bg-surface ring-1 ring-border
                p-5 md:p-6
                shadow-[0_1px_3px_hsl(0_0%_0%/0.04)]
                hover:ring-accent/40 hover:-translate-y-1
                hover:shadow-[0_14px_36px_-14px_hsl(var(--accent)/0.30)]
                transition-all duration-300
              "
            >
              {/* Icon + giant metric row */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="
                    h-10 w-10 rounded-xl grid place-items-center
                    bg-accent/12 text-accent
                    ring-1 ring-accent/25
                    transition-transform duration-300
                    group-hover:scale-105
                  "
                >
                  <b.icon className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="text-right">
                  <div className="font-display font-extrabold leading-none tabular-nums text-[clamp(1.5rem,2.2vw,1.875rem)] text-accent tracking-tight">
                    {b.metric}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                    {b.metricLabel}
                  </div>
                </div>
              </div>

              <h3 className="font-display text-[15px] md:text-base font-bold text-foreground mb-1.5 leading-tight">
                {b.title}
              </h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA + microcopy */}
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-[12px] font-mono uppercase tracking-[0.22em] text-foreground/85">
            No listing fees · No subscriptions · 12% per sale
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={sellerUrl}
              className="
                group inline-flex items-center justify-center gap-2
                h-12 px-7 rounded-full
                bg-gradient-to-b from-accent to-accent-hover
                text-accent-foreground text-[14px] font-bold tracking-tight
                shadow-[0_8px_24px_-6px_hsl(var(--accent)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.30),inset_0_-2px_0_hsl(0_0%_0%/0.18)]
                hover:-translate-y-px hover:from-accent-hover hover:to-accent
                active:translate-y-0 active:shadow-[0_3px_10px_-2px_hsl(var(--accent)/0.40),inset_0_1px_0_hsl(0_0%_100%/0.15)]
                transition-all duration-150
              "
            >
              Start selling
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/sellers/program"
              className="
                inline-flex items-center justify-center gap-1.5
                h-12 px-5 rounded-full
                text-[14px] font-semibold text-foreground/80
                hover:text-foreground hover:bg-foreground/5
                transition-all duration-150
              "
            >
              See earnings calculator
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
