'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  Headphones,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { formatMoney } from '@/lib/currency';

/* ForSellersLight — cobalt brand panel + earnings calculator. */

const COMMISSION = 0.12;

const WINS = [
  { icon: Wallet, label: '24-hour payouts · PayPal · Wise · UPI · Bank' },
  { icon: TrendingUp, label: 'Auto-promoted listings' },
  { icon: Headphones, label: 'Dedicated seller manager' },
];

export function ForSellersLight() {
  const reduce = useReducedMotion();
  const [salesPerWeek, setSalesPerWeek] = React.useState(8);
  const [avgPrice, setAvgPrice] = React.useState(31);

  const gross = salesPerWeek * 4 * avgPrice;
  const fee = gross * COMMISSION;
  const net = gross - fee;

  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || '/sellers/program';

  return (
    <section
      aria-label="Become a seller"
      className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1400px]">
        <div
          className="surface-brand relative overflow-hidden grid lg:grid-cols-2 gap-10 md:gap-14 items-center px-6 sm:px-10 lg:px-14 py-12 lg:py-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(700px 360px at 90% 110%, hsl(0 0% 100% / 0.12), transparent 60%),' +
                'radial-gradient(600px 320px at 0% -10%, hsl(0 0% 100% / 0.07), transparent 60%)',
            }}
          />

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 bg-white/10 rounded-full px-3 py-1.5 ring-1 ring-white/15">
              <Sparkles className="h-3 w-3" />
              For sellers
            </div>
            <h2 className="font-display font-extrabold leading-[0.92] tracking-[-0.025em] text-[clamp(2rem,5vw,3.5rem)] text-white mb-4">
              Trade your grind into cash.
            </h2>
            <p className="text-[15px] md:text-base text-white/85 max-w-md mb-6 leading-relaxed">
              12% flat commission. No subscription. KYC once, sell forever.
              Payouts hit PayPal · Wise · UPI · Bank in under 24 hours.
            </p>

            <ul className="space-y-2 mb-7">
              {WINS.map((w) => (
                <li key={w.label} className="flex items-center gap-2.5 text-[14px] text-white">
                  <span className="h-6 w-6 rounded-full bg-white/15 grid place-items-center">
                    <w.icon className="h-3 w-3 text-white" />
                  </span>
                  {w.label}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <a href={sellerUrl}>
                <button className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-white text-[hsl(var(--primary))] font-bold text-[14px] hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
                  Apply to sell
                  <ArrowRight className="h-4 w-4" />
                </button>
              </a>
              <Link
                href="/sellers/program"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold text-white/85 hover:text-white transition-colors"
              >
                Read seller terms
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative bg-[hsl(var(--surface))] rounded-3xl p-6 md:p-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-1">
                  Live calculator
                </div>
                <div className="font-display text-lg font-extrabold text-[hsl(var(--foreground))]">
                  Your monthly take-home
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
            </div>

            <div className="space-y-5 mb-6">
              <Slider
                label="Sales per week"
                value={salesPerWeek}
                min={1}
                max={40}
                onChange={setSalesPerWeek}
                fmt={(v) => `${v}`}
              />
              <Slider
                label="Avg price"
                value={avgPrice}
                min={6}
                max={250}
                step={1}
                onChange={setAvgPrice}
                fmt={(v) => formatMoney(v, 'USD')}
              />
            </div>

            <div className="rounded-2xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] p-4">
              <div className="flex items-center justify-between text-[12px] text-[hsl(var(--muted-foreground))] mb-1.5">
                <span>Gross</span>
                <span className="tabular-nums">{formatMoney(gross, 'USD')}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[hsl(var(--muted-foreground))] mb-3">
                <span>GETX fee (12%)</span>
                <span className="tabular-nums text-[hsl(var(--error))]">−{formatMoney(fee, 'USD')}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                <span className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                  You keep
                </span>
                <span className="font-display text-2xl font-extrabold text-[hsl(var(--primary))] tabular-nums">
                  {formatMoney(net, 'USD')}
                </span>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-[hsl(var(--muted-foreground))] text-center">
              Average GETX PoGo seller: 8 sales/week · $31 avg
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-[13px]">
        <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="font-semibold text-[hsl(var(--foreground))] tabular-nums">
          {fmt(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--primary))]"
      />
    </div>
  );
}
