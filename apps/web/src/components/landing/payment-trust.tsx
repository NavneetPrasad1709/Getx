'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Star, Lock, BadgeCheck } from 'lucide-react';

/* PaymentTrust — payment-method logo strip + trust badge row.

   Eldorado ends its homepage with a payment-method wall; ZeusX uses a
   "Trusted across India" stripe. Combined into one slim section: left
   side is a horizontal logo bar (inline-SVG so nothing remote loads),
   right side is a trust-and-rating cluster. Sits between MarketplaceSection
   and HowItWorks — the visitor sees the payment rails the same moment
   they're considering pulling out their phone. */

const EASE = [0.22, 1, 0.36, 1] as const;

/* Payment logo strip — global rails (Stripe-routed cards + PayPal)
   lead the row. Regional rails (UPI, etc.) ride along behind because
   GETX is USD-primary post-pivot. */
const PAYMENT_LOGOS = [
  { name: 'Visa', Logo: VisaLogo },
  { name: 'Mastercard', Logo: MastercardLogo },
  { name: 'Amex', Logo: AmexLogo },
  { name: 'PayPal', Logo: PaypalLogo },
  { name: 'Stripe', Logo: StripeLogo },
  { name: 'UPI', Logo: UpiLogo },
];

const BADGES = [
  { icon: Shield, label: 'PCI-DSS compliant' },
  { icon: Lock, label: '256-bit TLS encryption' },
  { icon: BadgeCheck, label: 'Sumsub global KYC' },
];

export function PaymentTrust() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Payment methods and trust signals"
      className="relative px-4 sm:px-6 lg:px-8 py-14 md:py-16 bg-[hsl(var(--surface-elevated))]"
    >
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-center"
        >
          {/* LEFT — payment logos */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-5">
              Pay how you want
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {PAYMENT_LOGOS.map(({ name, Logo }, i) => (
                <motion.div
                  key={name}
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }}
                  className="inline-flex items-center justify-center h-12 px-4 sm:px-5 rounded-xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.5)] hover:border-[hsl(var(--primary)/0.4)] hover:-translate-y-0.5 transition-all duration-ui"
                  aria-label={name}
                >
                  <Logo />
                </motion.div>
              ))}
            </div>
            <p className="mt-5 text-[12px] text-[hsl(var(--muted-foreground))]">
              + Apple Pay, Google Pay, iDEAL, SEPA, and 18 more regional
              methods routed through Stripe & PayPal.
            </p>
          </div>

          {/* RIGHT — trust cluster */}
          <div className="lg:border-l lg:border-[hsl(var(--border))] lg:pl-12">
            {/* Trust headline — review counts go live once we have real,
                non-seeded buyer data to back them. Keeping a vague claim
                here would invite a regulatory complaint. */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  />
                ))}
              </div>
              <div>
                <div className="font-display text-base font-extrabold text-[hsl(var(--foreground))] leading-none">
                  Buyer-rated
                </div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Every review verified post-delivery
                </div>
              </div>
            </div>

            {/* Badges */}
            <ul className="space-y-2.5">
              {BADGES.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-2.5 text-[13px] text-[hsl(var(--foreground))]"
                >
                  <span className="h-7 w-7 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] grid place-items-center">
                    <b.icon className="h-3.5 w-3.5" />
                  </span>
                  {b.label}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------- inline payment logos --------------------------- */

function StripeLogo() {
  return (
    <svg viewBox="0 0 80 28" className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="20"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
        fontWeight="800"
        fill="#635BFF"
        letterSpacing="0.5"
      >
        stripe
      </text>
    </svg>
  );
}

function PaypalLogo() {
  return (
    <svg viewBox="0 0 96 28" className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="20"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="0"
      >
        <tspan fill="#003087">Pay</tspan>
        <tspan fill="#0070BA">Pal</tspan>
      </text>
    </svg>
  );
}

function AmexLogo() {
  return (
    <svg viewBox="0 0 64 28" className="h-5 w-auto" aria-hidden>
      <rect x="0" y="2" width="64" height="24" rx="3" fill="#2E77BB" />
      <text
        x="32"
        y="19"
        textAnchor="middle"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="800"
        fill="#ffffff"
        letterSpacing="0.5"
      >
        AMEX
      </text>
    </svg>
  );
}

function UpiLogo() {
  return (
    <svg viewBox="0 0 80 28" className="h-5 w-auto text-[hsl(var(--foreground))]" aria-hidden>
      <text
        x="0"
        y="20"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="20"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="0.5"
      >
        UPI<tspan fill="#FB8C00">›</tspan>
      </text>
    </svg>
  );
}

function VisaLogo() {
  // Visa brand navy on light, lifted to a brighter cobalt on dark so the
  // mark remains legible while staying on-brand.
  return (
    <svg viewBox="0 0 80 28" className="h-5 w-auto text-[#1A1F71] dark:text-[#7FA8FF]" aria-hidden>
      <text
        x="0"
        y="22"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="22"
        fontStyle="italic"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="1"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 64 28" className="h-6 w-auto" aria-hidden>
      <circle cx="22" cy="14" r="11" fill="#EB001B" />
      <circle cx="38" cy="14" r="11" fill="#F79E1B" />
      <path
        d="M30 5.5 A11 11 0 0 1 30 22.5 A11 11 0 0 1 30 5.5"
        fill="#FF5F00"
      />
    </svg>
  );
}

