'use client';

import * as React from 'react';
import { ShieldCheck, MessageCircle, Lock, BadgeCheck } from 'lucide-react';
import { UspCard } from '@/components/ui/usp-card';

/* UspCards — landing-page promise grid.
 *
 * Four big pastel cards that close the sale: money-back guarantee, 24/7
 * support, escrow protection, verified sellers. Each card has a chunky
 * illustrated icon, dark editorial type, and an action pill — modelled
 * after Eldorado's USP block. Stacks 1-col → 2-col → 4-col across
 * breakpoints so it reads as an "infomercial" strip on mobile and a
 * confidence row on desktop.
 */

export function UspCards() {
  return (
    <section aria-label="Why GetX" className="relative py-16 md:py-24">
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary mb-3 font-bold">
            Our promise
          </div>
          <h2 className="font-display font-bold text-foreground text-[clamp(2rem,4.5vw,3rem)] leading-[0.95] tracking-[-0.025em] mb-3">
            Built on{' '}
            <span className="italic font-light text-primary">trust</span>.
          </h2>
          <p className="text-[14.5px] text-foreground/80 leading-relaxed">
            Four reasons gamers pick GetX over the alternatives — backed by
            actual guarantees, not slogans.
          </p>
        </div>

        {/* 4-card grid — pastel cards stand out against the dark page bg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <UspCard
            index={0}
            theme="cream"
            icon={ShieldCheck}
            watermark="01"
            title="Money-back guarantee"
            body="Get your order or get a refund. 3-day window, full escrow protection — no questions, no friction."
            ctaLabel="How refunds work"
            ctaHref="/refund"
          />
          <UspCard
            index={1}
            theme="mint"
            icon={MessageCircle}
            watermark="24/7"
            title="Real human support"
            body="Seller-success team escalates disputes in under 1 hour. No bots, no runaround — every hour, every day."
            ctaLabel="Chat now"
            ctaHref="/contact"
          />
          <UspCard
            index={2}
            theme="sky"
            icon={Lock}
            watermark="100%"
            title="Escrow protected"
            body="Funds held until you confirm delivery. Sellers can't touch your money until you've received what you bought."
            ctaLabel="See how escrow works"
            ctaHref="/how-it-works"
          />
          <UspCard
            index={3}
            theme="lilac"
            icon={BadgeCheck}
            watermark="ID"
            title="Sumsub verified sellers"
            body="Every seller passes government-ID verification through Sumsub before their first listing goes live. No anonymous accounts, ever."
            ctaLabel="Meet our sellers"
            ctaHref="/sellers/stories"
          />
        </div>
      </div>
    </section>
  );
}
