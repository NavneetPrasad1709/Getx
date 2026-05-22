'use client';

import * as React from 'react';
import { motion, useReducedMotion } from '@getx/ui';
import { Check, X, Minus, Sparkles, Crown } from 'lucide-react';

/* Comparison Table — receipts. Lays GetX against the two competitors we hear
   shopping-around buyers compare us with most often. The GetX column is
   visually elevated so it reads as the "obvious choice" at a glance.

   Rows are ordered by what shoppers actually mention in pre-purchase chat:
   payout speed, payment options, dispute time, language, then the standard
   trust commodities (escrow, KYC, refund). */

type Verdict = 'yes' | 'no' | 'partial';

interface Row {
  feature: string;
  detail?: string;
  getx: { verdict: Verdict; note: string };
  eldorado: { verdict: Verdict; note: string };
  playerauctions: { verdict: Verdict; note: string };
}

const ROWS: Row[] = [
  {
    feature: 'Multi-rail payouts',
    detail: 'PayPal · Wise · Bank · UPI (IN)',
    getx: { verdict: 'yes', note: '24 hours' },
    eldorado: { verdict: 'partial', note: 'PayPal · Skrill' },
    playerauctions: { verdict: 'no', note: 'PayPal · 5-7 days' },
  },
  {
    feature: 'Currency-aware UI',
    detail: 'USD / EUR / GBP / INR / BRL / more',
    getx: { verdict: 'yes', note: '12 currencies' },
    eldorado: { verdict: 'partial', note: 'USD-only display' },
    playerauctions: { verdict: 'partial', note: 'USD-only display' },
  },
  {
    feature: 'Median dispute resolution',
    detail: 'Time from raise to resolution',
    getx: { verdict: 'yes', note: '< 24 hours' },
    eldorado: { verdict: 'partial', note: '3-5 days' },
    playerauctions: { verdict: 'partial', note: '5-7 days' },
  },
  {
    feature: 'Escrow protection',
    getx: { verdict: 'yes', note: 'GETX Shield vault' },
    eldorado: { verdict: 'yes', note: 'Manual hold' },
    playerauctions: { verdict: 'yes', note: 'Standard hold' },
  },
  {
    feature: 'KYC-verified sellers',
    detail: 'Sumsub global · Aadhaar IN',
    getx: { verdict: 'yes', note: 'Sumsub · 100%' },
    eldorado: { verdict: 'partial', note: 'Email only' },
    playerauctions: { verdict: 'partial', note: 'Tiered' },
  },
  {
    feature: 'Global checkout',
    detail: 'Stripe (cards, wallets, UPI, SEPA, more)',
    getx: { verdict: 'yes', note: 'Stripe-routed' },
    eldorado: { verdict: 'partial', note: 'Stripe + Skrill' },
    playerauctions: { verdict: 'partial', note: 'PayPal-first' },
  },
  {
    feature: 'Median delivery time',
    detail: 'Order paid → account received',
    getx: { verdict: 'yes', note: '5 minutes' },
    eldorado: { verdict: 'partial', note: '30-60 min' },
    playerauctions: { verdict: 'partial', note: '1-3 hours' },
  },
  {
    feature: 'Pokemon GO catalog depth',
    detail: 'Hundo / shiny / legendary tagging',
    getx: { verdict: 'yes', note: 'Built for it' },
    eldorado: { verdict: 'partial', note: 'Generic listing' },
    playerauctions: { verdict: 'partial', note: 'Generic listing' },
  },
  {
    feature: 'Marketplace commission',
    detail: 'Seller take-home',
    getx: { verdict: 'yes', note: '12%' },
    eldorado: { verdict: 'no', note: '18-22%' },
    playerauctions: { verdict: 'no', note: '17-22%' },
  },
];

function VerdictCell({ v, note, highlight }: { v: Verdict; note: string; highlight: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 px-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          v === 'yes'
            ? highlight
              ? 'bg-success text-success-foreground shadow-[0_0_20px_hsl(var(--success)/0.5)]'
              : 'bg-success/15 text-success'
            : v === 'no'
              ? 'bg-error/15 text-error'
              : 'bg-muted/20 text-muted-foreground'
        }`}
      >
        {v === 'yes' ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : v === 'no' ? (
          <X className="h-4 w-4" strokeWidth={3} />
        ) : (
          <Minus className="h-4 w-4" strokeWidth={3} />
        )}
      </span>
      <span className={`text-[11px] tabular-nums text-center ${highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
        {note}
      </span>
    </div>
  );
}

export function ComparisonTable() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="GetX vs competitors"
      className="relative isolate overflow-hidden border-t border-border/40 py-24 md:py-32"
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-background" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.10),transparent_50%)]" />

      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center mb-14 md:mb-16">
          <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/[0.06] text-[10px] md:text-[11px] font-semibold tracking-[0.22em] uppercase">
            <Crown className="h-3 w-3 text-primary" />
            <span className="text-primary">The honest comparison</span>
          </div>
          <h2 className="font-display font-bold leading-[0.95] tracking-[-0.035em] text-[clamp(2.25rem,6vw,5rem)] mb-5">
            Built{' '}
            <span className="gradient-text-cyan bg-[length:200%_100%] animate-shimmer">globally</span>.<br />
            Not USD-only-or-die.
          </h2>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed">
            Every other marketplace bolts non-USD currencies on as an afterthought. We treat every market as a primary market. Receipts below.
          </p>
        </div>

        {/* Desktop table */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:block surface-cinematic rounded-3xl overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-5 font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider w-2/5">
                  Feature
                </th>
                <th className="p-5 relative">
                  <div className="absolute inset-x-3 inset-y-2 -z-10 rounded-2xl bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/30" />
                  <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                      <Sparkles className="h-2.5 w-2.5" /> Us
                    </span>
                    <span className="font-display text-xl font-bold tracking-tight">GetX</span>
                  </div>
                </th>
                <th className="p-5">
                  <span className="font-display text-base text-muted-foreground">Eldorado.gg</span>
                </th>
                <th className="p-5">
                  <span className="font-display text-base text-muted-foreground">PlayerAuctions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-background/30' : ''}>
                  <td className="p-5 border-t border-border/40">
                    <div className="font-semibold text-sm text-foreground">{row.feature}</div>
                    {row.detail ? (
                      <div className="text-xs text-muted-foreground mt-0.5">{row.detail}</div>
                    ) : null}
                  </td>
                  <td className="border-t border-primary/20 relative">
                    <div className="absolute inset-x-3 inset-y-0 -z-10 bg-primary/5" />
                    <VerdictCell v={row.getx.verdict} note={row.getx.note} highlight />
                  </td>
                  <td className="border-t border-border/40">
                    <VerdictCell v={row.eldorado.verdict} note={row.eldorado.note} highlight={false} />
                  </td>
                  <td className="border-t border-border/40">
                    <VerdictCell v={row.playerauctions.verdict} note={row.playerauctions.note} highlight={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Mobile stacked cards */}
        <div className="md:hidden space-y-3">
          {ROWS.map((row) => (
            <div key={row.feature} className="surface-cinematic rounded-2xl p-4">
              <div className="font-semibold text-sm text-foreground mb-0.5">{row.feature}</div>
              {row.detail ? (
                <div className="text-xs text-muted-foreground mb-3">{row.detail}</div>
              ) : <div className="mb-3" />}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-primary font-semibold text-center mb-1">GetX</div>
                  <VerdictCell v={row.getx.verdict} note={row.getx.note} highlight />
                </div>
                <div className="rounded-xl border border-border p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground text-center mb-1">Eldorado</div>
                  <VerdictCell v={row.eldorado.verdict} note={row.eldorado.note} highlight={false} />
                </div>
                <div className="rounded-xl border border-border p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground text-center mb-1">PlayerAuc</div>
                  <VerdictCell v={row.playerauctions.verdict} note={row.playerauctions.note} highlight={false} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
          Competitor figures pulled from their public terms + buyer reviews on Trustpilot &amp; Reddit as of May 2026. We update this quarterly.
        </p>
      </div>
    </section>
  );
}
