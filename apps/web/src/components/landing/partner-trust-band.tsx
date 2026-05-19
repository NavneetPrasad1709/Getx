'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Shield,
  Lock,
  CheckCircle2,
} from 'lucide-react';

/* PartnerTrustBand — strip of real partner logos + certification badges.
 *
 * Sits between Hero and Games to anchor the "is this legit?" question
 * before a visitor scrolls further. Logos are typographic (no image
 * dependencies / no licensing risk) — same approach as the partner
 * row on Stripe, Vercel, Linear landing pages.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

interface Partner {
  name: string;
  /* What this partner does — shown on hover/below in mono */
  role: string;
  /* Inline SVG-style logo treatment via typography */
  logoNode: React.ReactNode;
}

const PARTNERS: Partner[] = [
  {
    name: 'Sumsub',
    role: 'Seller identity',
    logoNode: (
      <span className="font-display font-extrabold tracking-tight">
        sums<span className="text-[#1769FF]">ub</span>
      </span>
    ),
  },
  {
    name: 'Stripe',
    role: 'Payment rails',
    logoNode: (
      <span
        className="font-display font-extrabold italic tracking-tight"
        style={{ color: '#635BFF' }}
      >
        stripe
      </span>
    ),
  },
  {
    name: 'PayPal',
    role: 'Buyer protection',
    logoNode: (
      <span className="font-display font-extrabold italic tracking-tight">
        <span style={{ color: '#003087' }}>Pay</span>
        <span style={{ color: '#0070BA' }}>Pal</span>
      </span>
    ),
  },
  {
    name: 'Cloudflare',
    role: 'Edge + WAF',
    logoNode: (
      <span
        className="font-display font-extrabold tracking-tight"
        style={{ color: '#F38020' }}
      >
        Cloudflare
      </span>
    ),
  },
];

/* Certifications kept honest: only real, verifiable infrastructure
   claims. Removed Trustpilot (no real reviews yet, fake number = trust
   killer) and "Global · 180+ countries" (unverifiable for a launching
   brand). GDPR moved from "Ready" → "Compliant" for clarity. */
const CERTIFICATIONS = [
  { icon: Shield, label: 'PCI-DSS', sub: 'Compliant rails' },
  { icon: Lock, label: '256-bit TLS', sub: 'End-to-end' },
  { icon: CheckCircle2, label: 'GDPR', sub: 'Compliant' },
];

export function PartnerTrustBand() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Trusted partners and certifications"
      className="relative isolate border-y border-border/40 py-10 md:py-14 overflow-hidden"
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-surface/30" />

      <div className="container relative">
        {/* Eyebrow */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center mb-7 md:mb-9"
        >
          <div className="inline-flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.28em] text-foreground/85">
            <span aria-hidden className="h-px w-7 bg-foreground/25" />
            Built on infrastructure you know
            <span aria-hidden className="h-px w-7 bg-foreground/25" />
          </div>
        </motion.div>

        {/* PARTNER LOGOS — typographic row */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 md:gap-x-16 gap-y-6 mb-10">
          {PARTNERS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.06 * i, ease: EASE }}
              className="group flex flex-col items-center gap-1"
            >
              <div className="text-[18px] sm:text-[22px] md:text-[24px] opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300">
                {p.logoNode}
              </div>
              <div className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-foreground/75 group-hover:text-foreground transition-colors">
                {p.role}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CERTIFICATIONS — small badge row */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5 pt-7 border-t border-border/40"
        >
          {CERTIFICATIONS.map((c) => (
            <div
              key={c.label}
              className="
                inline-flex items-center gap-2
                rounded-full px-3 py-1.5
                bg-surface ring-1 ring-border
                hover:ring-foreground/25 transition-colors duration-200
              "
            >
              <c.icon className="h-3 w-3 text-success" strokeWidth={2.5} />
              <span className="text-[11.5px] font-semibold text-foreground">{c.label}</span>
              <span className="text-[10px] font-mono text-foreground/85">·</span>
              <span className="text-[10px] font-mono text-foreground/85">{c.sub}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
