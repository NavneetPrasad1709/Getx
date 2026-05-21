'use client';

import * as React from 'react';
import Link from 'next/link';
import { GetXLogo } from '@getx/ui';

/* AuthLayout — 21st.dev SignInPage split.
   ────────────────────────────────────────────────────────────────────
   Form left, hero right with floating testimonial cards on desktop.
   On mobile the hero collapses and the form occupies the full viewport.
   Each call site supplies its own form body via `children`; the wrapper
   handles the chrome, heading, footer, and the brand-side imagery.

   Why the change from the previous brand-left/form-right + video layout:
   the user provided this design explicitly from 21st.dev and asked it to
   be adopted across the auth surface. Same component API as before
   (eyebrow / title / subtitle / footer) so the four auth pages
   (login, register, verify-email, forgot-password, reset-password) work
   without touching their form bodies. */

export type AuthTestimonial = {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /* Optional override — defaults to the GETX gaming-marketplace image. */
  heroImageSrc?: string;
  testimonials?: AuthTestimonial[];
};

/* Default hero image — gaming-flavoured. Swap to a GETX brand render
   once the design team produces one. Unsplash CC0 placeholder for now
   so the layout never ships with a broken image. */
const DEFAULT_HERO_SRC =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2160&q=80';

const DEFAULT_TESTIMONIALS: AuthTestimonial[] = [
  {
    avatarSrc: 'https://randomuser.me/api/portraits/women/57.jpg',
    name: 'Sarah Chen',
    handle: '@sarahplays',
    text:
      'Bought a Lvl 50 account through GETX escrow — credentials in 6 min, refund on the one I bounced on. Trust on autopilot.',
  },
  {
    avatarSrc: 'https://randomuser.me/api/portraits/men/64.jpg',
    name: 'Marcus Johnson',
    handle: '@marcusgg',
    text:
      'Cashed out my stockpile in a weekend. Wise payout cleared in 24h. No platform fee on the buy side keeps customers coming back.',
  },
  {
    avatarSrc: 'https://randomuser.me/api/portraits/men/32.jpg',
    name: 'David Martinez',
    handle: '@dmrtnz',
    text:
      "Disputes get answered by actual humans within an hour. That's the only metric that matters to me when I'm dropping $400 on an account.",
  },
];

function TestimonialCard({
  testimonial,
  delayClass,
}: {
  testimonial: AuthTestimonial;
  delayClass: string;
}) {
  return (
    <div
      className={`animate-testimonial ${delayClass} flex items-start gap-3 rounded-3xl border border-white/15 bg-zinc-900/55 p-5 backdrop-blur-xl w-64 text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]`}
    >
      <img
        src={testimonial.avatarSrc}
        className="h-10 w-10 rounded-2xl object-cover"
        alt=""
        loading="lazy"
      />
      <div className="text-sm leading-snug">
        <p className="flex items-center gap-1 font-semibold">
          {testimonial.name}
        </p>
        <p className="text-white/60 text-xs">{testimonial.handle}</p>
        <p className="mt-1 text-white/80">{testimonial.text}</p>
      </div>
    </div>
  );
}

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  heroImageSrc = DEFAULT_HERO_SRC,
  testimonials = DEFAULT_TESTIMONIALS,
}: Props) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-background text-foreground">
      {/* FORM SIDE */}
      <section className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 sm:px-10 pt-8">
          <Link href="/" aria-label="GETX home" className="inline-flex">
            <GetXLogo size="md" gradient />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8">
          <div className="w-full max-w-md">
            <div className="animate-element animate-delay-100 font-mono text-[11px] uppercase tracking-[0.2em] text-primary mb-3">
              {eyebrow}
            </div>
            <h1 className="animate-element animate-delay-200 font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {title}
            </h1>
            <p className="animate-element animate-delay-300 mt-2 text-sm md:text-base text-muted-foreground">
              {subtitle}
            </p>

            <div className="animate-element animate-delay-400 mt-8">
              {children}
            </div>
          </div>
        </div>

        {footer && (
          <div className="px-6 sm:px-10 py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </section>

      {/* HERO SIDE — desktop only */}
      <section className="hidden md:block flex-1 relative p-4">
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center shadow-2xl"
          style={{ backgroundImage: `url(${heroImageSrc})` }}
          aria-hidden
        />
        {/* Cinematic overlay for legibility behind testimonial cards. */}
        <div
          aria-hidden
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-gradient-to-t from-zinc-950/85 via-zinc-950/35 to-transparent"
        />

        {testimonials.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center pointer-events-none">
            {testimonials[0] && (
              <div className="pointer-events-auto">
                <TestimonialCard
                  testimonial={testimonials[0]}
                  delayClass="animate-delay-1000"
                />
              </div>
            )}
            {testimonials[1] && (
              <div className="hidden xl:block pointer-events-auto">
                <TestimonialCard
                  testimonial={testimonials[1]}
                  delayClass="animate-delay-1200"
                />
              </div>
            )}
            {testimonials[2] && (
              <div className="hidden 2xl:block pointer-events-auto">
                <TestimonialCard
                  testimonial={testimonials[2]}
                  delayClass="animate-delay-1400"
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
