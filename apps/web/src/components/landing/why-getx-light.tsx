'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  BadgeCheck,
  Headset,
  Globe,
  ArrowRight,
} from 'lucide-react';

/* WhyGetxLight — the "we vs sketchy Discord seller" comparison + USP wall.

   Eldorado's "Safe & Easy Trading" section is what this maps to. We split
   the row into a 4-card USP grid plus a small comparison panel on the
   right (or below on mobile). Keeps the differentiator concrete: Why
   GETX over a Discord DM or a Telegram channel. */

const EASE = [0.22, 1, 0.36, 1] as const;

const USPS = [
  {
    icon: ShieldCheck,
    title: 'Escrow before, not after.',
    body:
      'Money locks the second you pay. Seller can\'t touch it until you confirm the account works. Industry standard for high-value drops.',
    stat: '$0',
    statLabel: 'Successful fraud since launch',
  },
  {
    icon: BadgeCheck,
    title: 'Sumsub-verified sellers.',
    body:
      'Every seller passes Sumsub global ID + AML screening. No anonymous Discord aliases. Track-record visible on every listing.',
    stat: '85+',
    statLabel: 'Verified active sellers',
  },
  {
    icon: Globe,
    title: 'Multi-currency checkout.',
    body:
      'Pay in your local currency via Stripe or PayPal. Live FX shown next to USD — the rate you see is the rate you pay, no hidden margin.',
    stat: '0%',
    statLabel: 'Hidden FX margin',
  },
  {
    icon: Headset,
    title: '24/7 human support.',
    body:
      'Global support team on chat around the clock. Disputes resolved inside 24 hours, not 7 days.',
    stat: '< 24h',
    statLabel: 'Median dispute close time',
  },
];

const COMPARE = [
  { label: 'Escrow protection', us: true, them: false },
  { label: 'KYC-verified sellers', us: true, them: false },
  { label: 'Multi-currency checkout', us: true, them: 'Often' },
  { label: 'Money-back guarantee', us: true, them: false },
  { label: 'Public seller ratings', us: true, them: false },
  { label: 'Dispute team', us: true, them: false },
];

export function WhyGetxLight() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Why GETX"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28 bg-[hsl(var(--surface-elevated))]"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-3xl mb-12 md:mb-14">
          <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
            <ShieldCheck className="h-3 w-3" />
            Why GETX
          </div>
          <h2 className="font-display font-extrabold leading-[0.92] tracking-[-0.025em] text-[clamp(2rem,5.5vw,4rem)] text-[hsl(var(--foreground))] mb-3">
            Built for gamers,
            <br />
            not Discord chaos.
          </h2>
          <p className="text-[15px] md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl">
            Most peer-to-peer trades happen in a DM with no escrow, no
            verified identity, and no recourse when a seller ghosts. GETX
            puts every order behind escrow, every seller behind Sumsub
            KYC, and a real dispute team between you and a bad outcome.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8">
          {/* LEFT — 4 USP cards (2×2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {USPS.map((u, i) => (
              <motion.div
                key={u.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                className="relative bg-white rounded-2xl border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(222_24%_8%/0.03)] hover:shadow-[0_8px_24px_hsl(222_100%_56%/0.08)] hover:-translate-y-0.5 transition-all duration-ui p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] grid place-items-center">
                    <u.icon className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-display text-xl font-extrabold text-[hsl(var(--foreground))] tabular-nums leading-none">
                      {u.stat}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] mt-1">
                      {u.statLabel}
                    </div>
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-[hsl(var(--foreground))] mb-2 leading-tight">
                  {u.title}
                </h3>
                <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {u.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* RIGHT — comparison mini-panel */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="relative bg-white rounded-2xl border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(222_24%_8%/0.03)] p-6 md:p-7"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-3">
              GetX vs the Discord deal
            </div>
            <h3 className="font-display text-xl md:text-2xl font-extrabold text-[hsl(var(--foreground))] mb-5 leading-tight">
              Apples to oranges.
            </h3>

            <ul className="space-y-2">
              {COMPARE.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 py-2 border-b border-[hsl(var(--border))] last:border-0"
                >
                  <span className="text-[13px] text-[hsl(var(--foreground))]">
                    {row.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <CompareCell variant="us" value={row.us} />
                    <CompareCell variant="them" value={row.them} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2 pt-4 mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">
              <span>&nbsp;</span>
              <div className="flex items-center gap-2">
                <span className="w-8 text-center text-[hsl(var(--primary))] font-bold">GETX</span>
                <span className="w-8 text-center">Discord</span>
              </div>
            </div>

            <Link
              href="/trust"
              className="mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[hsl(var(--primary))] text-white text-[13px] font-semibold hover:bg-[hsl(var(--primary-hover))] transition-colors"
            >
              Read trust &amp; safety
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CompareCell({
  variant,
  value,
}: {
  variant: 'us' | 'them';
  value: boolean | string;
}) {
  const us = variant === 'us';
  if (value === true) {
    return (
      <span
        className={`w-8 grid place-items-center h-7 rounded-full text-[11px] font-bold ${
          us
            ? 'bg-[hsl(var(--primary))] text-white'
            : 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
        }`}
        aria-label="yes"
      >
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        className="w-8 grid place-items-center h-7 rounded-full bg-[hsl(var(--error)/0.1)] text-[hsl(var(--error))] text-[11px] font-bold"
        aria-label="no"
      >
        ✕
      </span>
    );
  }
  return (
    <span
      className="w-8 grid place-items-center h-7 rounded-full bg-[hsl(var(--surface-elevated))] text-[hsl(var(--muted-foreground))] text-[10px] font-semibold"
      aria-label={String(value)}
    >
      ~
    </span>
  );
}
