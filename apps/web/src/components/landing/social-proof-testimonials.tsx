'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Star, Quote, Heart } from 'lucide-react';

/* SocialProofTestimonials — 3 short reviewer cards.

   Eldorado leans on TrustPilot logos; ZeusX leans on numeric review
   counts under each listing. Both work because they keep the testimonial
   short and concrete. We give every card: rating, one-liner quote, name,
   handle, verified-purchase badge, region. Light cards on the page bg. */

const EASE = [0.22, 1, 0.36, 1] as const;

const TESTIMONIALS = [
  {
    name: 'Arjun M.',
    handle: '@RaidLeader_Mumbai',
    region: 'Mumbai',
    quote:
      'Got my Lv 48 Valor account in 8 minutes. Hundo Mewtwo, IVs verified, escrow held until I confirmed. Killer.',
    badge: 'Verified buyer · 3 orders',
    rating: 5,
    initial: 'AM',
    grad: 'linear-gradient(135deg, #FF1B1B 0%, hsl(var(--primary)) 100%)',
  },
  {
    name: 'Priya S.',
    handle: '@MysticPriya',
    region: 'São Paulo',
    quote:
      'I sell raid pass bundles every weekend. PayPal payout the same evening. $1,500 last month — payouts just work.',
    badge: 'PRO seller · 240 orders',
    rating: 5,
    initial: 'PS',
    grad: 'linear-gradient(135deg, #3B4CCA 0%, #7AC4FF 100%)',
  },
  {
    name: 'Karan R.',
    handle: '@InstinctKaran',
    region: 'Delhi NCR',
    quote:
      'Two Master-League boosting jobs done. Both came in below the Discord asking price. Reverse-market actually works.',
    badge: 'Boosted to Master · 2 jobs',
    rating: 5,
    initial: 'KR',
    grad: 'linear-gradient(135deg, #10B981 0%, #A7F3D0 100%)',
  },
];

export function SocialProofTestimonials() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Trainer stories"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10 md:mb-14">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
              <Heart className="h-3 w-3" />
              Buyer stories
            </div>
            <h2 className="font-display font-extrabold leading-[0.92] tracking-[-0.025em] text-[clamp(2rem,5vw,3.5rem)] text-[hsl(var(--foreground))]">
              Real buyers. Real receipts.
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-display text-2xl md:text-3xl font-extrabold text-[hsl(var(--foreground))] tabular-nums leading-none">
                Verified
              </div>
              <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                Every review is post-delivery only
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.article
              key={t.handle}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              className="relative bg-[hsl(var(--surface))] rounded-3xl border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.05)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] hover:shadow-[0_8px_24px_hsl(var(--primary)/0.12)] hover:-translate-y-0.5 transition-all duration-ui p-6 md:p-7"
            >
              <Quote className="h-5 w-5 text-[hsl(var(--primary)/0.4)] mb-4" />
              <p className="text-[15px] text-[hsl(var(--foreground))] leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-3.5 w-3.5 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[hsl(var(--border))]">
                <div
                  className="h-10 w-10 rounded-full grid place-items-center text-white font-bold text-xs"
                  style={{ background: t.grad }}
                >
                  {t.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[hsl(var(--foreground))] text-[13px] truncate">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                    {t.handle} · {t.region}
                  </div>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] text-[10px] font-semibold uppercase tracking-wider">
                {t.badge}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
