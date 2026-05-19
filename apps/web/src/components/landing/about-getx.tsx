'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  Quote,
} from 'lucide-react';

/* AboutGetx — founder story + remote-first narrative.

   Two columns: pitch + founder quote on the left, four stat tiles +
   trust + hiring tiles on the right. Sits on the light page bg between
   the press wall and coming-soon games. */

const EASE = [0.22, 1, 0.36, 1] as const;

const STATS = [
  { v: '2024', l: 'Founded' },
  { v: '12', l: 'Builders' },
  { v: 'Remote-first', l: 'Operating model' },
  { v: 'Bootstrapped', l: 'Backed by founders' },
];

export function AboutGetx() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="About GETX"
      className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1080px]">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-start">
          {/* LEFT — story */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] rounded-full px-3 py-1.5">
              <MapPin className="h-3 w-3" />
              Remote · global · gamer-built
            </div>

            <h2 className="font-display font-extrabold leading-[0.95] tracking-[-0.02em] text-[clamp(2rem,4.5vw,3.25rem)] text-[hsl(var(--foreground))] mb-4">
              Built by gamers,
              <br />
              <span className="text-[hsl(var(--primary))]">for gamers</span>.
            </h2>

            <p className="text-[15px] md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed mb-4">
              We started GETX after losing $200 to a Discord seller in 2023.
              Existing marketplaces took 7 days to process disputes, surfaced
              escrow only in legal fine print, and treated international
              buyers as second-class.
            </p>
            <p className="text-[15px] md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed mb-7">
              So we built the market we wanted to buy from: USD-primary with
              multi-currency display, Stripe / PayPal / UPI checkout,
              KYC-verified sellers, transparent dispute SLA, refunds inside
              two hours. Pokémon GO is live — Roblox, Genshin and BGMI come
              next.
            </p>

            <figure className="relative rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] p-5 md:p-6">
              <Quote className="absolute top-4 right-5 h-5 w-5 text-[hsl(var(--primary)/0.35)]" />
              <blockquote className="text-[14px] md:text-[15px] text-[hsl(var(--foreground))] leading-relaxed mb-4">
                &ldquo;Every escrow rule, every refund window, every seller
                tier on GETX started as a problem one of us hit personally
                — then got engineered out. Built by gamers who got burned
                so you don&apos;t have to.&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <span
                  className="h-9 w-9 rounded-full grid place-items-center text-white text-[11px] font-bold shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
                  }}
                  aria-hidden
                >
                  NP
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                    Navneet Prasad
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Founder · GETX
                  </div>
                </div>
              </figcaption>
            </figure>

            <div className="mt-7">
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[hsl(var(--primary))] hover:underline"
              >
                Read the full story
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* RIGHT — stat tiles */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
            className="grid grid-cols-2 gap-3 md:gap-4"
          >
            {STATS.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] p-5 md:p-6"
              >
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-2">
                  {s.l}
                </div>
                <div className="font-display text-2xl md:text-3xl font-extrabold tabular-nums text-[hsl(var(--foreground))] leading-none">
                  {s.v}
                </div>
              </div>
            ))}

            <div className="col-span-2 rounded-2xl bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] p-5 md:p-6">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] grid place-items-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-base font-extrabold text-[hsl(var(--foreground))] leading-tight">
                    Trusted from day one
                  </div>
                  <div className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Escrow on every order · $0 successful fraud · global delivery
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/careers"
              className="col-span-2 rounded-2xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] p-5 md:p-6 flex items-center gap-3 hover:border-[hsl(var(--primary))] transition-colors group"
            >
              <span className="h-10 w-10 rounded-xl bg-[hsl(var(--surface))] grid place-items-center shrink-0">
                <Users className="h-4 w-4 text-[hsl(var(--foreground))]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-extrabold text-[hsl(var(--foreground))] leading-tight">
                  Hiring engineers + ops
                </div>
                <div className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Remote-first · seed-stage equity
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))] transition-all shrink-0" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
