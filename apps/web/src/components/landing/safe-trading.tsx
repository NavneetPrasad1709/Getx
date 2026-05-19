'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  RefreshCcw,
  Headset,
  Lock,
  ArrowRight,
  FileCheck2,
  Globe,
  BadgeCheck,
} from 'lucide-react';

/* SafeTrading — Eldorado-style "Safe & Easy Trading" block.

   Three feature columns + a thin payment row at the bottom. Lives on
   the marketplace dark surface so the rails above and the coming-soon
   below read as one continuous experience. */

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Escrow on every order',
    body:
      'Your payment is held in our vault until you confirm the account, top-up, or item works. The seller never sees a cent before you do.',
    cta: { label: 'How escrow works', href: '/trust' },
  },
  {
    icon: RefreshCcw,
    title: '7-day money-back',
    body:
      'If a drop falls outside the SLA or fails verification we refund 100% automatically. No dispute paperwork, no haggling.',
    cta: { label: 'Refund policy', href: '/refund' },
  },
  {
    icon: Headset,
    title: '24/7 live support',
    body:
      'Global support team on chat around the clock — English first, more languages rolling out. Median dispute close under 24 hours.',
    cta: { label: 'Talk to support', href: '/contact' },
  },
];

/* Payment surface — global rails first (Stripe-routed cards, PayPal),
   then regional options. Order matters: the first pill is what most
   buyers will see as the primary checkout path. */
const PAYMENT_PILLS = [
  'Visa',
  'Mastercard',
  'Amex',
  'PayPal',
  'Apple Pay',
  'Google Pay',
  'UPI',
  'iDEAL',
  'SEPA',
];

/* Trust badges — global compliance + security signals that work for
   any buyer/seller. Each label paired with icon + sub-label for context. */
const TRUST_BADGES = [
  { icon: Lock, label: 'PCI-DSS', sub: 'Stripe processed' },
  { icon: ShieldCheck, label: 'ISO 27001', sub: 'Information security' },
  { icon: FileCheck2, label: 'SOC 2 Type II', sub: 'Audit in progress' },
  { icon: Globe, label: 'GDPR · DPDP · LGPD', sub: 'Privacy by design' },
  { icon: BadgeCheck, label: 'Sumsub KYC', sub: 'Verified sellers worldwide' },
  { icon: Headset, label: '24/7 Support', sub: 'English · live chat' },
];

export function SafeTrading() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Safe and easy trading"
      className="relative bg-[#0F0C26] text-white px-4 sm:px-6 lg:px-8 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-10 md:mb-14"
        >
          <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]/30 rounded-full px-3 py-1.5">
            <Lock className="h-3 w-3" />
            Trade Shield
          </div>
          <h2 className="font-display font-extrabold text-white text-[clamp(1.75rem,5vw,3.25rem)] leading-[0.95] tracking-tight mb-3">
            Safe &amp; Easy Trading
          </h2>
          <p className="text-[14px] sm:text-[15px] text-white/70 leading-[1.6]">
            Built around the way gamers actually trade — multi-currency
            checkout, verified sellers worldwide, and a dispute team you
            can actually reach.
          </p>
        </motion.div>

        {/* Feature columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
              className="relative rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-6 md:p-7 hover:ring-[hsl(var(--primary))]/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))] grid place-items-center mb-5">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg md:text-xl font-extrabold tracking-tight mb-2">
                {f.title}
              </h3>
              <p className="text-[13px] sm:text-[14px] text-white/65 leading-relaxed mb-5">
                {f.body}
              </p>
              <Link
                href={f.cta.href}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[hsl(var(--primary))] hover:underline"
              >
                {f.cta.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Global trust badges row — compliance + security signals */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-10 md:mt-14"
        >
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-white/45 mb-4 text-center">
            Built for trust
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3">
            {TRUST_BADGES.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-3 py-2.5"
              >
                <span className="h-8 w-8 rounded-lg grid place-items-center bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))] shrink-0">
                  <b.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-white leading-tight truncate">
                    {b.label}
                  </div>
                  <div className="text-[10px] text-white/55 truncate">
                    {b.sub}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Payment strip */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mt-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/8 px-5 sm:px-8 py-5 md:py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/55 shrink-0">
            Pay with
          </div>
          <ul className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {PAYMENT_PILLS.map((p) => (
              <li
                key={p}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 ring-1 ring-white/10 text-[12px] font-medium text-white/85"
              >
                {p}
              </li>
            ))}
            <li className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-medium text-white/55">
              + 18 more
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
