'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, ShieldCheck, BadgeCheck, Headset } from 'lucide-react';

/* WhyGetx — Rockstar "principles" wall.

   The previous bento with chips and cyan glow was the AI-vibe trap; this
   version uses Rockstar's numbered-rows pattern instead. One left column
   with a massive headline, one right column with four hairline-divided
   principles. Each principle has a numeric anchor and a single short stat
   line — no nested cards, no glow surfaces. */

interface Principle {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  stat: string;
  statLabel: string;
}

const PRINCIPLES: Principle[] = [
  {
    number: '01',
    icon: Zap,
    title: 'Lightning delivery',
    body: 'Median PoGo order finishes inside five minutes. 97% deliver under ten.',
    stat: '5 min',
    statLabel: 'Median delivery',
  },
  {
    number: '02',
    icon: ShieldCheck,
    title: 'Escrow on every order',
    body: 'Funds locked in our vault until you confirm receipt. Three-day inspection window.',
    stat: '0%',
    statLabel: 'Successful fraud since launch',
  },
  {
    number: '03',
    icon: BadgeCheck,
    title: 'Verified Indian sellers',
    body: 'Aadhaar + PAN KYC on every active PoGo seller. Real people, real accountability.',
    stat: '1.2K+',
    statLabel: 'KYC-verified sellers',
  },
  {
    number: '04',
    icon: Headset,
    title: 'Real-human support',
    body: 'WhatsApp + email in Hindi and English. Disputes resolved by humans in under a day.',
    stat: '<24h',
    statLabel: 'Median dispute resolution',
  },
];

export function WhyGetx() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Why GetX"
      className="relative bg-black border-t border-border/60 py-20 md:py-32"
    >
      <div className="container">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20">
          {/* Left — sticky headline */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-4">
              Why GetX for Pokémon GO
            </div>
            <h2 className="font-display font-bold uppercase leading-[0.86] tracking-[-0.02em] text-[clamp(2.5rem,7vw,6rem)] text-white">
              Four
              <br />
              promises.
              <br />
              <span className="text-primary">Every trade.</span>
            </h2>
            <p className="mt-6 max-w-md text-base text-white/65 leading-snug">
              We started with Pokémon GO because Indian trainers got the worst deal on every
              other marketplace. Four things we fixed — and keep fixing — on every single trade.
            </p>
          </div>

          {/* Right — numbered rows */}
          <ul className="border-t border-border/60">
            {PRINCIPLES.map((p, i) => (
              <motion.li
                key={p.number}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.55,
                  delay: 0.06 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group border-b border-border/60 py-8 md:py-10 transition-colors hover:bg-[hsl(0_0%_3%)]"
              >
                <div className="flex items-start gap-5 md:gap-7">
                  <div className="font-display text-3xl md:text-4xl font-bold text-primary leading-none tabular-nums pt-1">
                    {p.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p.icon className="h-5 w-5 text-primary shrink-0" aria-hidden />
                      <h3 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight text-white leading-tight">
                        {p.title}
                      </h3>
                    </div>
                    <p className="text-sm md:text-base text-white/65 max-w-xl leading-relaxed">
                      {p.body}
                    </p>
                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="font-display text-3xl md:text-4xl font-bold text-white tabular-nums leading-none">
                        {p.stat}
                      </span>
                      <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/55">
                        {p.statLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
