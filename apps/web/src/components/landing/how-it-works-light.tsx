'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Wallet,
  Lock,
  Zap,
  ArrowRight,
  Pause,
  Play,
  Check,
  ShieldCheck,
  Star,
  CreditCard,
  Eye,
} from 'lucide-react';

/* HowItWorksLight — auto-playing 4-step buyer flow with a live phone
 * mockup showing real UI per step.
 *
 * Layout: 2 columns on lg+.
 *   Left  — heading, ticker, vertical step list (compact).
 *   Right — phone mockup whose screen swaps per active step:
 *           browse listings → payment options → escrow lock → delivered.
 *
 * Mockups are built in JSX (no external assets) so they stay in sync
 * with our actual UI tokens and animate cleanly between steps.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const STEP_DURATION_MS = 3000;

const STEPS = [
  {
    n: '01',
    icon: Search,
    title: 'Browse drops',
    body: 'Filter live listings by level, team, region, or price. Verified sellers only.',
  },
  {
    n: '02',
    icon: Wallet,
    title: 'Pay your way',
    body: 'Stripe, PayPal, cards, UPI — payment routes straight into GETX escrow.',
  },
  {
    n: '03',
    icon: Lock,
    title: 'Escrow holds',
    body: "Seller can't cash out until you confirm. 3-day inspection window.",
  },
  {
    n: '04',
    icon: Zap,
    title: 'Get your account',
    body: 'Median 5-min handover via encrypted chat. Login + recovery delivered.',
  },
] as const;

/* ──────────────────────────────────────────────────────────────────────
   PHONE SCREENS — one per step. Each renders inside the same bezel so
   the transition feels like a real device swapping screens.
   ──────────────────────────────────────────────────────────────────── */

function BrowseScreen() {
  const listings = [
    { name: 'Lv 50 Mystic · Hundo Mewtwo', price: '$189', rating: 4.9, hue: 220 },
    { name: '14,500 PokéCoins · Auto', price: '$62', rating: 5.0, hue: 38 },
    { name: 'Lv 47 Valor · 200 shinies', price: '$236', rating: 4.9, hue: 348 },
  ];
  return (
    <div className="h-full w-full p-3 pt-6 space-y-2">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/10 mb-2">
        <Search className="h-3 w-3 text-white/85" strokeWidth={2.5} />
        <span className="text-[10px] text-white/70 font-medium">hundo mewtwo · lv 50</span>
      </div>
      {listings.map((l, i) => (
        <motion.div
          key={l.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
          className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-2"
        >
          <div
            className="aspect-[16/9] rounded-md mb-1.5"
            style={{
              background: `linear-gradient(135deg, hsl(${l.hue} 80% 40%) 0%, hsl(${(l.hue + 30) % 360} 80% 20%) 100%)`,
            }}
          />
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-semibold text-white/90 truncate">{l.name}</span>
            <span className="font-mono text-primary font-bold">{l.price}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-2 w-2 fill-amber-400 text-amber-400" />
            <span className="text-[8px] text-white/85">{l.rating} · Verified</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PayScreen() {
  const methods = [
    { label: 'Stripe · **** 4242', icon: CreditCard, active: true },
    { label: 'PayPal', icon: Wallet, active: false },
    { label: 'UPI · @paytm', icon: Wallet, active: false },
  ];
  return (
    <div className="h-full w-full p-3 pt-6 flex flex-col">
      <div className="text-[8px] uppercase tracking-[0.2em] text-white/80 mb-1">Checkout</div>
      <div className="font-display text-xl font-extrabold text-white tabular-nums">$189</div>
      <div className="text-[9px] text-white/85 mb-3">Lv 50 Mystic · Hundo Mewtwo</div>

      <div className="space-y-1.5 mb-3">
        {methods.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] ${
              m.active
                ? 'bg-primary/15 ring-1 ring-primary/40 text-white'
                : 'bg-white/[0.04] ring-1 ring-white/10 text-white/85'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <m.icon className="h-3 w-3" strokeWidth={2.25} />
              <span>{m.label}</span>
            </div>
            {m.active ? (
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-primary">
                <Check className="h-2 w-2 text-white" strokeWidth={3} />
              </span>
            ) : (
              <span className="h-3 w-3 rounded-full ring-1 ring-white/20" />
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-auto rounded-lg bg-success/10 ring-1 ring-success/30 px-2.5 py-1.5 inline-flex items-center gap-1.5"
      >
        <ShieldCheck className="h-3 w-3 text-success" strokeWidth={2.5} />
        <span className="text-[9px] text-success font-semibold">Escrow-protected</span>
      </motion.div>

      <button className="mt-1.5 w-full rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground text-[10px] font-bold py-2 shadow-[0_4px_10px_-2px_hsl(var(--primary)/0.5)]">
        Pay $189
      </button>
    </div>
  );
}

function EscrowScreen() {
  return (
    <div className="h-full w-full p-3 pt-6 flex flex-col items-center text-center">
      <div className="text-[8px] uppercase tracking-[0.2em] text-white/80 mb-2 mt-2">Order #GTX-08471</div>

      {/* Animated lock illustration */}
      <motion.div
        className="relative my-3"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 rounded-full bg-primary/40 blur-2xl animate-pulse" />
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary-hover grid place-items-center shadow-[0_0_24px_hsl(var(--primary)/0.5)]">
          <Lock className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </motion.div>

      <div className="font-display text-base font-bold text-white">Funds held safely</div>
      <div className="text-[9px] text-white/85 mt-0.5">Seller can&apos;t access until you confirm</div>

      {/* Inspection window */}
      <div className="mt-4 w-full rounded-lg bg-white/[0.04] ring-1 ring-white/10 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Eye className="h-2.5 w-2.5 text-white/85" strokeWidth={2.5} />
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/85">Inspection</span>
          </div>
          <span className="text-[9px] font-mono text-primary font-bold">2d 23h</span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary-hover"
            initial={{ width: '0%' }}
            animate={{ width: '15%' }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </div>
      </div>

      <button className="mt-2 w-full rounded-full bg-success text-success-foreground text-[10px] font-bold py-2 shadow-[0_4px_10px_-2px_hsl(var(--success)/0.4)]">
        Confirm delivery
      </button>
    </div>
  );
}

function ReceiveScreen() {
  return (
    <div className="h-full w-full p-3 pt-6 flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.55, duration: 0.7, delay: 0.15 }}
        className="mt-2 mb-3 relative"
      >
        <div className="absolute inset-0 rounded-full bg-success/40 blur-2xl animate-pulse" />
        <div className="relative h-16 w-16 rounded-full bg-success grid place-items-center shadow-[0_0_24px_hsl(var(--success)/0.6)]">
          <Check className="h-8 w-8 text-success-foreground" strokeWidth={3} />
        </div>
      </motion.div>

      <div className="font-display text-base font-bold text-white">Delivered.</div>
      <div className="text-[9px] text-white/85 mt-0.5">In 4 min 22 sec</div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 w-full rounded-lg bg-white/[0.04] ring-1 ring-white/10 p-2.5 text-left"
      >
        <div className="text-[8px] uppercase tracking-wider text-white/80 mb-1">Login</div>
        <div className="font-mono text-[10px] text-white/90">trainer_valor47@gmail.com</div>
        <div className="font-mono text-[10px] text-white/85">PIN ••••••</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-1.5 w-full rounded-lg bg-success/10 ring-1 ring-success/30 px-2.5 py-1.5 text-left"
      >
        <div className="inline-flex items-center gap-1.5 text-success">
          <Zap className="h-2.5 w-2.5" strokeWidth={2.5} />
          <span className="text-[9px] font-semibold">Seller paid · escrow released</span>
        </div>
      </motion.div>
    </div>
  );
}

const SCREENS = [BrowseScreen, PayScreen, EscrowScreen, ReceiveScreen];

/* ──────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────────────── */

export function HowItWorksLight() {
  const reduce = useReducedMotion();
  const [activeStep, setActiveStep] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, STEP_DURATION_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const ActiveScreen = SCREENS[activeStep];

  return (
    <section
      aria-label="How buying works"
      className="relative isolate py-20 md:py-24 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient backdrop blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 30% 40%, hsl(var(--primary) / 0.10), transparent 65%)',
        }}
      />

      <div className="container relative">
        {/* HEADING + LIVE TICKER */}
        <div className="flex items-end justify-between gap-6 mb-12 md:mb-16 flex-wrap">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display font-bold leading-[0.9] tracking-[-0.025em] text-[clamp(2.25rem,5vw,4rem)] text-foreground">
              From pick to play in{' '}
              <span className="italic font-light text-primary">five minutes</span>.
            </h2>
            <p className="text-[14px] md:text-[15px] text-muted-foreground max-w-md">
              Watch the flow in 12 seconds. Each step shows the actual screen
              you&apos;ll see.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-surface ring-1 ring-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] shadow-[0_2px_8px_-2px_hsl(0_0%_0%/0.06)]">
            <span className="relative flex h-1.5 w-1.5">
              {!paused && !reduce ? (
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
              ) : null}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            </span>
            <span className="text-foreground/90">
              {paused ? 'Paused' : 'Live demo'}
            </span>
            {paused ? (
              <Play className="h-3 w-3 text-foreground/75" />
            ) : (
              <Pause className="h-3 w-3 text-foreground/75" />
            )}
          </div>
        </div>

        {/* MAIN SPLIT — step list left, phone mockup right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
          {/* LEFT — vertical step list (mobile gets steps FIRST so users
              read the flow before seeing the phone demo it produces) */}
          <div className="space-y-3 order-1 lg:order-1">
            {STEPS.map((s, i) => {
              const isActive = i === activeStep;
              const isPast = i < activeStep;
              return (
                <motion.button
                  key={s.n}
                  onClick={() => setActiveStep(i)}
                  onMouseEnter={() => setActiveStep(i)}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                  className="
                    w-full text-left relative overflow-hidden
                    rounded-2xl p-5 md:p-6
                    bg-surface ring-1 ring-border
                    hover:ring-foreground/20
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    transition-all duration-300
                    cursor-pointer
                  "
                  style={{
                    boxShadow: isActive
                      ? '0 16px 36px -14px hsl(var(--primary) / 0.30), 0 0 0 1.5px hsl(var(--primary) / 0.55)'
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Number badge */}
                    <motion.div
                      className="h-12 w-12 shrink-0 rounded-2xl grid place-items-center font-display font-extrabold text-base tabular-nums"
                      animate={{
                        backgroundColor: isActive
                          ? 'hsl(var(--primary))'
                          : isPast
                            ? 'hsl(var(--primary) / 0.85)'
                            : 'hsl(var(--primary) / 0.10)',
                        color: isActive || isPast
                          ? 'hsl(var(--primary-foreground))'
                          : 'hsl(var(--primary))',
                        boxShadow: isActive
                          ? '0 6px 18px -4px hsl(var(--primary) / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.25)'
                          : 'none',
                      }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      {isPast ? (
                        <Check className="h-5 w-5" strokeWidth={3} />
                      ) : (
                        s.n
                      )}
                    </motion.div>

                    {/* Title + body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <s.icon
                          className="h-4 w-4 shrink-0"
                          style={{
                            color: isActive
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--foreground) / 0.55)',
                          }}
                          strokeWidth={2.25}
                        />
                        <motion.h3
                          className="font-display text-base md:text-lg font-bold leading-tight"
                          animate={{
                            color: isActive
                              ? 'hsl(var(--foreground))'
                              : 'hsl(var(--foreground) / 0.85)',
                          }}
                        >
                          {s.title}
                        </motion.h3>
                      </div>
                      <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar for active step */}
                  <AnimatePresence>
                    {isActive && !reduce && !paused ? (
                      <motion.div
                        key="bar"
                        aria-hidden
                        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary to-primary-hover rounded-r-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: STEP_DURATION_MS / 1000,
                          ease: 'linear',
                        }}
                      />
                    ) : null}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* RIGHT — phone mockup. Responsive scaling: shrinks to 0.85
              on small screens (<360px) so it fits, full 280px otherwise. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="order-2 lg:order-2 mx-auto w-full max-w-[280px] flex justify-center"
          >
            <div className="relative scale-[0.82] sm:scale-90 md:scale-100 origin-center">
              {/* Glow behind phone — colored ambient */}
              <div
                aria-hidden
                className="absolute -inset-8 rounded-[3rem] -z-10"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 80% at 50% 50%, hsl(var(--primary) / 0.30), transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />

              {/* iPhone bezel */}
              <div
                className="relative w-[280px] h-[560px] rounded-[2.5rem] p-2 shadow-[0_40px_80px_-20px_hsl(0_0%_0%/0.7)]"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(222 30% 18%), hsl(222 47% 5%))',
                  boxShadow:
                    'inset 0 0 0 2px hsl(222 25% 35%), inset 0 0 0 7px hsl(222 47% 3%), 0 40px 80px -20px hsl(0 0% 0% / 0.7)',
                }}
              >
                {/* Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-black rounded-full z-50 flex items-center justify-end px-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgb(34,197,94)] animate-pulse" />
                </div>

                {/* Screen */}
                <div className="absolute inset-[7px] rounded-[2.1rem] overflow-hidden bg-[#050914] text-white">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={reduce ? false : { opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? undefined : { opacity: 0, x: -12 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="absolute inset-0"
                    >
                      <ActiveScreen />
                    </motion.div>
                  </AnimatePresence>

                  {/* Home bar */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[100px] h-[3px] bg-white/30 rounded-full" />
                </div>
              </div>

              {/* Floating step label below phone */}
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    aria-label={`Show step ${i + 1}`}
                    className={
                      i === activeStep
                        ? 'h-1.5 w-6 rounded-full bg-primary'
                        : 'h-1.5 w-1.5 rounded-full bg-foreground/20 hover:bg-foreground/40 transition-colors'
                    }
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline"
          >
            Read the full safety guide
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
