'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Gift,
  Share2,
  Wallet,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { formatMoney } from '@/lib/currency';

/* ReferralTeaser — "$5 credit each" referral funnel.

   Slim cobalt-tinted panel between BuyerFAQ and FinalCTA. Three-step
   how-it-works, a code-copy chip, and a "Get my link" CTA. Gaming
   communities scale via Discord / Twitter / IRL forwards — make the
   referral surface so obvious nobody scrolls past it. */

const EASE = [0.22, 1, 0.36, 1] as const;
const SAMPLE_CODE = 'GAMER100';

const STEPS = [
  {
    icon: Share2,
    title: 'Share your link',
    body: 'Discord / Twitter / IRL — they tap, they sign up.',
  },
  {
    icon: Wallet,
    title: 'They place a first order',
    body: 'Any drop, any category — once payment confirms.',
  },
  {
    icon: Gift,
    title: 'Both get $5',
    body: 'Credited to your GETX wallet within 24 hours.',
  },
];

export function ReferralTeaser() {
  const reduce = useReducedMotion();
  const [copied, setCopied] = React.useState(false);

  const copyCode = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(SAMPLE_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <section
      aria-label="Refer a friend"
      className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1080px]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: EASE }}
          className="relative overflow-hidden rounded-3xl border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.06)] p-6 sm:p-8 md:p-10"
        >
          {/* Decorative gift glyph backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[hsl(var(--primary)/0.12)] blur-3xl"
          />

          <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
            {/* LEFT — pitch + steps */}
            <div>
              <div className="inline-flex items-center gap-1.5 mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                <Gift className="h-3 w-3" />
                Refer &amp; earn
              </div>
              <h2 className="font-display font-extrabold leading-[0.95] tracking-[-0.02em] text-[clamp(1.75rem,4.5vw,3rem)] text-[hsl(var(--foreground))] mb-3">
                Refer a friend.{' '}
                <span className="text-[hsl(var(--primary))]">Both get $5.</span>
              </h2>
              <p className="text-[14px] sm:text-[15px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-7 max-w-xl">
                Top referrers stacked $200+ in their wallet last month.
                Credits never expire, work on any category, and you can
                withdraw to PayPal or Wise on request.
              </p>

              {/* Steps */}
              <ol className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-7">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className="relative rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="h-8 w-8 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] grid place-items-center">
                        <s.icon className="h-4 w-4" />
                      </span>
                      <span className="font-display text-base font-extrabold text-[hsl(var(--muted-foreground)/0.4)] tabular-nums">
                        0{i + 1}
                      </span>
                    </div>
                    <div className="font-display text-[14px] font-bold text-[hsl(var(--foreground))] leading-tight mb-1">
                      {s.title}
                    </div>
                    <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {s.body}
                    </div>
                  </li>
                ))}
              </ol>

              {/* Code + CTA row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={copyCode}
                  className="group inline-flex items-center justify-between gap-3 h-12 px-3 pl-4 rounded-full bg-[hsl(var(--surface))] border border-dashed border-[hsl(var(--primary)/0.55)] text-[hsl(var(--foreground))] hover:border-solid hover:bg-[hsl(var(--surface-elevated))] transition-all w-full sm:w-auto sm:min-w-[260px]"
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[10.5px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] shrink-0">
                      Your code
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-[hsl(var(--primary))] truncate">
                      {SAMPLE_CODE}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-semibold transition-colors shrink-0 ${
                      copied
                        ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                        : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--primary))] group-hover:text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </span>
                </button>

                <Link
                  href="/profile/referrals"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[hsl(var(--primary))] text-white text-[13px] font-bold hover:bg-[hsl(var(--primary-hover))] shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.5)] transition-all"
                >
                  Get my link
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* RIGHT — leaderboard tease */}
            <div className="lg:w-[220px] shrink-0 hidden lg:block">
              <div className="rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] p-5">
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-3">
                  Top earners · May
                </div>
                <ul className="space-y-2.5">
                  {[
                    { rank: 1, handle: '@rohan_t', earned: 60 },
                    { rank: 2, handle: '@MysticPriya', earned: 44 },
                    { rank: 3, handle: '@InstinctKaran', earned: 34 },
                  ].map((row) => (
                    <li
                      key={row.rank}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="font-display font-extrabold text-[hsl(var(--primary))] tabular-nums w-4 shrink-0">
                          {row.rank}
                        </span>
                        <span className="text-[hsl(var(--foreground))] truncate">
                          {row.handle}
                        </span>
                      </span>
                      <span className="font-display font-extrabold tabular-nums text-[hsl(var(--foreground))] shrink-0">
                        {formatMoney(row.earned, 'USD')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
