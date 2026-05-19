'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, Wallet, Sparkles } from 'lucide-react';
import { motion, useReducedMotion, GetXLogo } from '@getx/ui';

/* AuthLayout — cinematic split-screen.

   The brand-side (left on lg+) plays an ambient looping gameplay video on a
   noir base. On mobile the video collapses; the auth form occupies the full
   screen and the brand panel becomes a compact glow strip at the top.

   The right-side wraps every form in a generous form well so each input has
   breathing room — auth converts when the form feels easy, not when it feels
   crowded. */

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Escrow on every order',
    body: 'Money held safe until you confirm delivery. Or 3-day auto-release with zero disputes.',
  },
  {
    icon: Zap,
    title: 'Sub-10 minute delivery',
    body: 'Verified sellers respond fast. Avg 6 minutes from purchase to credentials.',
  },
  {
    icon: Wallet,
    title: 'UPI direct, no platform fee',
    body: 'Buyers pay zero platform fees. Sellers paid in 24h via PayPal · Wise · UPI · Bank.',
  },
];

const HERO_VIDEO_SRC = process.env.NEXT_PUBLIC_HERO_VIDEO_SRC ?? '/hero/hero.mp4';
const HERO_POSTER_SRC = process.env.NEXT_PUBLIC_HERO_POSTER_SRC ?? '/hero/poster.jpg';

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthLayout({ eyebrow, title, subtitle, children, footer }: Props) {
  const reduce = useReducedMotion();
  const [videoFailed, setVideoFailed] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* BRAND SIDE — ambient video + cinematic frame */}
      <aside className="relative lg:flex-1 lg:max-w-[640px] overflow-hidden bg-[hsl(222_47%_3%)] text-white">
        {/* Ambient video bg */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {!reduce && !videoFailed && HERO_VIDEO_SRC ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster={HERO_POSTER_SRC}
              onError={() => setVideoFailed(true)}
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
          ) : null}

          {/* Layered noir treatment */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222_47%_3%)] via-[hsl(222_47%_3%)]/70 to-[hsl(222_47%_3%)]/95" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_30%,hsl(195_100%_55%/0.32),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_75%_70%,hsl(45_100%_60%/0.18),transparent_70%)]" />

          {/* Faint grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />

          {/* Drifting glow orbs */}
          <div className="absolute -top-32 -left-20 h-[440px] w-[440px] rounded-full bg-primary/18 blur-[120px] animate-drift-slow mix-blend-screen" />
          <div className="absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-primary-glow/15 blur-[120px] animate-drift-slower mix-blend-screen" />

          {/* Cinematic scanline */}
          <div className="absolute inset-0 hero-scanline opacity-60" />

          {/* Mobile fade-to-form */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,hsl(222_47%_3%))] lg:bg-none" />
        </div>

        <div className="relative h-full flex flex-col p-6 sm:p-10 lg:p-12 min-h-[320px] lg:min-h-screen">
          <Link href="/" aria-label="GETX home" className="inline-flex items-center gap-2 self-start">
            <GetXLogo size="lg" gradient glow={!reduce} className="text-white" />
          </Link>

          {/* Hero copy — hidden on mobile (form already has its own title) */}
          <div className="hidden lg:block mt-16">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/90 mb-3"
            >
              {eyebrow}
            </motion.div>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05]"
            >
              Trade gaming.
              <br />
              <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Without the trust tax.
              </span>
            </motion.h1>
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-5 text-white/65 max-w-md"
            >
              Join the marketplace where every seller is KYC-verified, every order is
              escrow-protected, and disputes are resolved by humans — not bots.
            </motion.p>

            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map((h, i) => (
                <motion.li
                  key={h.title}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center shadow-[0_0_20px_-6px_hsl(var(--primary-glow)/0.6)]">
                    <h.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{h.title}</div>
                    <div className="mt-0.5 text-xs text-white/55">{h.body}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Stats footer */}
          <div className="hidden lg:flex items-end justify-between mt-auto pt-12 text-white/55 text-xs font-mono uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Escrow on every order · 24/7 support</span>
            </div>
            <span>© GETX · Built remote-first</span>
          </div>
        </div>
      </aside>

      {/* FORM SIDE */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 lg:py-14">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden mb-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary mb-2">
                {eyebrow}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                {title}
              </h2>
              <p className="mt-2 text-sm md:text-base text-muted-foreground">{subtitle}</p>
            </div>

            {children}
          </motion.div>
        </div>

        {footer && (
          <div className="px-4 sm:px-8 py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </main>
    </div>
  );
}
