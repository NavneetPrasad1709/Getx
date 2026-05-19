'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Store,
  Wallet,
  AlertTriangle,
  UserCog,
} from 'lucide-react';

/* BuyerFAQ — tabbed accordion across 5 categories with 18 questions.

   Each category gets its own short stack so visitors aren't scrolling
   through 30 mixed items. Active tab persists in component state. The
   accordion item open inside a tab also persists across tab switches,
   keyed by question id, so the user can hop between tabs without
   losing their place. */

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

interface FaqCategory {
  id: 'buying' | 'selling' | 'payments' | 'disputes' | 'account';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FaqItem[];
}

const CATEGORIES: FaqCategory[] = [
  {
    id: 'buying',
    label: 'Buying',
    icon: ShoppingBag,
    items: [
      {
        id: 'delivery-time',
        q: 'How fast is delivery?',
        a: 'Median delivery is 5 minutes after payment confirms. Account credentials + recovery email are handed over in encrypted chat. PokéCoin top-ups and items deliver inside the same window.',
      },
      {
        id: 'seller-no-deliver',
        q: 'What if the seller does not deliver?',
        a: 'Escrow holds 100% of your money until you confirm delivery. If the seller fails to deliver inside the SLA, you get a full automatic refund — no dispute paperwork needed.',
      },
      {
        id: 'all-sellers-verified',
        q: 'Are all sellers verified?',
        a: 'Yes. Every seller passes Sumsub identity verification and ships at least 5 reviewed orders before listing higher-value drops. Seller rating + order count are public on every listing.',
      },
      {
        id: 'compare-sellers',
        q: 'Can I compare sellers before buying?',
        a: 'Every listing shows the seller handle, rating, order count, response time, and tier (RISING / VERIFIED / TOP / PRO). Click the seller name to open their full profile with reviews.',
      },
    ],
  },
  {
    id: 'selling',
    label: 'Selling',
    icon: Store,
    items: [
      {
        id: 'become-seller',
        q: 'How do I become a seller?',
        a: 'Sign up, complete Sumsub identity verification, list your first drop. We review the first 3 listings inside 24 hours — once approved, you can list freely. No subscription. 12% flat commission per sale.',
      },
      {
        id: 'sell-international',
        q: 'Where can I sell?',
        a: 'GETX is a global marketplace — buyers and sellers from any country where Sumsub KYC clears. Pricing is USD-primary; we auto-convert at checkout so you always see local currency at the top of the cart.',
      },
      {
        id: 'payout-timing',
        q: 'When do I get paid?',
        a: 'Once the buyer confirms delivery (or the 3-day auto-release timer expires), funds release from escrow to your Stripe Connect or PayPal payout account. Standard transfers settle within 24 hours; top sellers (200+ orders) get 6-hour payouts.',
      },
      {
        id: 'fees',
        q: 'What does GETX charge?',
        a: 'Flat 12% commission per completed sale. No listing fees, no monthly subscription, no separate payment processing fee on top — gateway costs are absorbed by GETX.',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: Wallet,
    items: [
      {
        id: 'pay-methods',
        q: 'Which payment methods do you accept?',
        a: 'Visa, Mastercard, Amex, PayPal, Apple Pay, and Google Pay globally via Stripe. Regional rails (UPI, iDEAL, SEPA, more) light up automatically based on your billing country. Card payments confirm in seconds.',
      },
      {
        id: 'currency',
        q: 'What currency are prices in?',
        a: 'GETX is USD-primary. At checkout we show your local currency next to USD using live FX, and the gateway settles in whichever currency your card supports. No hidden FX margin — the rate you see is the rate you pay.',
      },
      {
        id: 'refund-method',
        q: 'How are refunds processed?',
        a: 'Refunds go back to the original payment method. Card refunds clear in 5-7 business days (bank-dependent). PayPal and wallet refunds clear inside 24 hours. All refunds are full — no fees deducted.',
      },
      {
        id: 'wallet-credits',
        q: 'What are GETX wallet credits?',
        a: 'You can hold pre-loaded balance in your GETX wallet (USD) for one-tap buying. Loyalty credits (referrals, waitlist bonuses) land here too. Wallet credits never expire and can be withdrawn to your payout account on request.',
      },
    ],
  },
  {
    id: 'disputes',
    label: 'Disputes',
    icon: AlertTriangle,
    items: [
      {
        id: 'account-ban',
        q: 'What if Niantic bans my account after I buy it?',
        a: 'We honour a 30-day warranty on trainer accounts. If Niantic flags the account within 30 days of purchase due to seller activity (not buyer-caused activity), we refund the order in full.',
      },
      {
        id: 'recovery-changes',
        q: 'What if the seller changes the recovery email later?',
        a: 'Recovery email transfer is part of the delivery handshake — we lock it server-side once you confirm. Any seller attempt to re-claim the account triggers an automatic dispute in your favour.',
      },
      {
        id: 'dispute-time',
        q: 'How long does a dispute take to resolve?',
        a: 'Median dispute close is under 24 hours. Both sides submit evidence (screenshots, chat logs), GETX support reviews, and the funds release accordingly. Escalations go to a human team lead within 48h.',
      },
      {
        id: 'refund-window',
        q: 'What\'s the refund window?',
        a: 'You have 3 days from delivery to confirm or dispute. If you do nothing in 3 days, the order auto-releases to the seller. For account drops, the 30-day warranty stays active beyond that.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: UserCog,
    items: [
      {
        id: 'create-account',
        q: 'Do I need an account to buy?',
        a: 'Yes — sign-up takes 30 seconds with email + phone. We need the account so the dispute system, wishlist, and order history can attach to a real identity. No KYC needed for buyers under $1,200/year.',
      },
      {
        id: 'data-handling',
        q: 'What data does GETX store?',
        a: 'Email, phone, hashed password, order history, wishlist, and (for sellers) the Sumsub verification result. We don\'t store payment card numbers — Stripe and PayPal handle those. Full policy at /privacy.',
      },
    ],
  },
];

export function BuyerFAQ() {
  const [activeTab, setActiveTab] = React.useState<FaqCategory['id']>('buying');
  const [openId, setOpenId] = React.useState<string | null>(CATEGORIES[0].items[0].id);

  const activeCategory =
    CATEGORIES.find((c) => c.id === activeTab) ?? CATEGORIES[0];

  return (
    <section
      aria-label="Buyer FAQ"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-24"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
            <ShieldCheck className="h-3 w-3" />
            Frequently asked questions
          </div>
          <h2 className="font-display font-extrabold leading-[0.95] tracking-[-0.02em] text-[clamp(2rem,5vw,3.5rem)] text-[hsl(var(--foreground))]">
            Got questions? We&apos;ve got you.
          </h2>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="FAQ categories"
          className="flex flex-wrap items-center justify-center gap-2 mb-8 md:mb-10"
        >
          {CATEGORIES.map((c) => {
            const active = c.id === activeTab;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(c.id)}
                className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[12.5px] sm:text-[13px] font-semibold transition-all ${
                  active
                    ? 'bg-[hsl(var(--primary))] text-white shadow-[0_8px_20px_-6px_hsl(var(--primary)/0.4)]'
                    : 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground)/0.75)] ring-1 ring-[hsl(var(--border))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-elevated))]'
                }`}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
                <span
                  className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9.5px] font-bold tabular-nums ${
                    active
                      ? 'bg-white/25 text-white'
                      : 'bg-[hsl(var(--muted-foreground)/0.15)] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  {c.items.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Accordion */}
        <ul className="space-y-3">
          {activeCategory.items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <li
                key={item.id}
                className="rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left hover:bg-[hsl(var(--surface-elevated))] transition-colors"
                >
                  <span className="font-display text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                    {item.q}
                  </span>
                  <span
                    className={`shrink-0 h-8 w-8 rounded-full grid place-items-center transition-colors ${
                      isOpen
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-elevated))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-5 text-[14px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[hsl(var(--primary))] hover:underline"
          >
            Full help centre · live chat
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
