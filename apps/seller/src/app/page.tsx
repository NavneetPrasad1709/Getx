'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { motion, useReducedMotion } from '@getx/ui';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  Eye,
  MessageSquare,
  Package,
  Plus,
  Sparkles,
  Star,
  Tag,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';
import { Badge, Button, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useAuth, type AuthUser } from '@/hooks/use-auth';
import { useMyListings, type SellerListing } from '@/hooks/use-seller-listings';
import { useMyOffers, type SellerOffer } from '@/hooks/use-seller-offers';
import { useMySellerOrders, type SellerOrderListItem } from '@/hooks/use-seller-orders';
import { useMyConversations } from '@/hooks/use-chat';
import { api } from '@/lib/api';

interface ActivateResponse {
  message: string;
  user: AuthUser;
}

/* Standard entrance easing across the dashboard — matches the rest of
   the GETX product so motion feels coherent. */
const EASE = [0.22, 1, 0.36, 1] as const;

/* Shared reveal variant — children stagger in slightly. */
const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* Count-up hook — animates a number from 0 to the target so big
   earnings figures feel earned rather than just appearing. Respects
   prefers-reduced-motion (returns the final value immediately). */
function useCountUp(target: number, durationMs = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const startTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    fromRef.current = value;
    startTsRef.current = null;
    const tick = (ts: number) => {
      if (startTsRef.current === null) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic — fast start, gentle settle.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // value intentionally omitted: we want to re-animate when target changes, not on every interpolation step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce, durationMs]);

  return value;
}

/* Pretty-format a money figure split into a big-integer and small-decimal
   span so the dashboard hero can render $1,234.56 with the cents kept
   visually subordinate. */
function MoneyDisplay({ value }: { value: number }) {
  const animated = useCountUp(value);
  const [intPart, decPart] = animated.toFixed(2).split('.');
  return (
    <span className="font-display font-extrabold tabular-nums leading-none">
      ${Number(intPart).toLocaleString('en-US')}
      <span className="text-muted-foreground/60 text-[55%] align-baseline">.{decPart}</span>
    </span>
  );
}

/* Plain integer count-up, no formatting prefix. */
function IntDisplay({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <span className="tabular-nums">{Math.round(animated).toLocaleString('en-US')}</span>;
}

/* GETX Seller — calm, simple dashboard.
   ─────────────────────────────────────────────────────────────────────
   Re-organised to read top-to-bottom as a single story instead of a
   wall of cards:

      1. Greeting + earnings hero        → what just happened
      2. "Right now" focus card          → what to do next
      3. Three stat cards                → are we growing
      4. Pipeline strip                  → where orders are
      5. Setup checklist (only if open)  → finish your store
      6. Recent activity                 → audit trail

   Eldorado.gg-style large numbers + zeusx-style soft pastel surfaces.
   Generous whitespace, single accent per row, no nested cards. */

export default function DashboardPage() {
  const { user, refetch } = useAuth();
  const qc = useQueryClient();
  const { data: listings } = useMyListings();
  const { data: offers } = useMyOffers();
  const { data: orders } = useMySellerOrders();
  const { data: convs } = useMyConversations(!!user);

  const activate = useMutation<ActivateResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await api.patch<ActivateResponse>('/auth/me/activate-seller');
      return data;
    },
    onSuccess: async () => {
      toast.success('Seller mode activated!');
      await refetch();
      await qc.invalidateQueries();
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to activate. Try again.');
    },
  });

  const isSeller = !!user?.isSeller;
  const stats = useMemo(
    () => deriveStats(user, listings, offers, orders, convs),
    [user, listings, offers, orders, convs],
  );

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
        }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-8 lg:space-y-12"
      >
        {!isSeller && (
          <motion.div variants={reveal}>
            <ActivateBanner pending={activate.isPending} onActivate={() => activate.mutate()} />
          </motion.div>
        )}

        <motion.div variants={reveal}>
          <Hero user={user} stats={stats} />
        </motion.div>

        <motion.div variants={reveal}>
          <FocusCard stats={stats} />
        </motion.div>

        <motion.div variants={reveal}>
          <StatsRow user={user} stats={stats} />
        </motion.div>

        <motion.div variants={reveal}>
          <Pipeline stats={stats} />
        </motion.div>

        <motion.div variants={reveal}>
          <SetupChecklist user={user} stats={stats} />
        </motion.div>

        <motion.div variants={reveal}>
          <Activity listings={listings ?? []} offers={offers ?? []} orders={orders ?? []} />
        </motion.div>
      </motion.div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  ACTIVATE BANNER — gentle nudge before becoming a seller            */
/* ══════════════════════════════════════════════════════════════════ */
function ActivateBanner({ onActivate, pending }: { onActivate: () => void; pending: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 p-6 lg:p-8">
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
            <Sparkles className="h-3 w-3" />
            One step to start
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">
            Turn on seller mode
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
            List accounts, top-ups, items or boosting in a minute. KYC only when you withdraw.
            Escrow protects every sale.
          </p>
        </div>
        <Button
          onClick={onActivate}
          disabled={pending}
          size="lg"
          className="self-start lg:self-auto h-12 px-6 gap-2 shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)]"
        >
          {pending ? 'Activating…' : 'Activate'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  HERO — soft pastel canvas, big earnings number, two CTAs           */
/* ══════════════════════════════════════════════════════════════════ */
function Hero({ user, stats }: { user: AuthUser | null; stats: SellerStats }) {
  const firstName = (user?.name ?? user?.username ?? 'there').split(' ')[0];
  const wallet = user?.sellerWallet ?? 0;
  const pending = user?.pendingEarnings ?? 0;
  const verifiedTier = user?.verifiedTier;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface via-surface to-primary/[0.04] ring-1 ring-border p-6 lg:p-10">
      {/* Decorative blur — single warm light from the top right */}
      <div
        aria-hidden
        className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-primary/12 blur-[100px]"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-accent/8 blur-[120px]"
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-success/10 ring-1 ring-success/25 font-mono text-[10px] uppercase tracking-[0.2em] text-success font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Seller active
          </span>
          {verifiedTier && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-primary/10 ring-1 ring-primary/20 font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              <BadgeCheck className="h-3 w-3" />
              {verifiedTier}
            </span>
          )}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight mb-3">
          Hey {firstName}
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-8 max-w-xl">
          {stats.urgentCount > 0
            ? `${stats.urgentCount} thing${stats.urgentCount === 1 ? '' : 's'} need${stats.urgentCount === 1 ? 's' : ''} you. Scroll down to clear them.`
            : 'Everything is on track. Keep listing to grow your store.'}
        </p>

        {/* Big earnings number + secondary metric — both count up on mount
            so the hero feels alive. The figures are responsive across
            two breakpoints so the cents stay readable. */}
        <div className="grid grid-cols-2 gap-4 sm:gap-10 mb-8 max-w-md min-w-0">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold mb-2">
              Available
            </div>
            <div className="text-[clamp(1.75rem,8vw,3.25rem)] text-foreground tabular-nums truncate">
              <MoneyDisplay value={wallet} />
            </div>
          </div>
          <div className="border-l border-border pl-4 sm:pl-6 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold mb-2">
              Pending
            </div>
            <div className="text-[clamp(1.75rem,8vw,3.25rem)] text-foreground/70 tabular-nums truncate">
              <MoneyDisplay value={pending} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/listings/new"
              className="
                inline-flex items-center gap-1.5 h-12 px-5 rounded-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[13.5px] font-bold tracking-tight
                shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
                transition-shadow hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]
              "
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create a drop
            </Link>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/requests"
              className="
                inline-flex items-center gap-1.5 h-12 px-5 rounded-full
                bg-surface ring-1 ring-border text-foreground
                text-[13.5px] font-semibold
                hover:ring-foreground/20 transition-colors
              "
            >
              Browse buyer requests
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  FOCUS CARD — one thing to do right now                             */
/*  Picks the single most-urgent task. Falls back to a positive empty  */
/*  state. Replaces the prior 4-tile action queue → less to read.      */
/* ══════════════════════════════════════════════════════════════════ */
function FocusCard({ stats }: { stats: SellerStats }) {
  const focus = pickFocus(stats);

  if (!focus) {
    return (
      <div className="rounded-3xl bg-success/5 ring-1 ring-success/20 px-6 py-5 flex items-center gap-4">
        <div className="grid place-items-center h-12 w-12 rounded-2xl bg-success/15 text-success shrink-0">
          <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <div className="font-display font-bold text-[16px]">All clear — nothing pending</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            You&apos;ve cleared your queue. List more drops to keep momentum.
          </div>
        </div>
      </div>
    );
  }

  const Icon = focus.icon;
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.995 }}>
      <Link
        href={focus.href}
        className="group relative overflow-hidden block rounded-3xl bg-gradient-to-br from-accent/12 via-surface to-surface ring-1 ring-accent/25 p-6 lg:p-7 hover:ring-accent/40 transition-shadow hover:shadow-[0_18px_48px_-18px_hsl(var(--accent)/0.45)]"
      >
        {/* Pulsing gradient blob — gentle attention without crossing into
            distraction. Loops infinitely at slow tempo. */}
        <motion.div
          aria-hidden
          className="absolute -top-16 -right-12 h-56 w-56 rounded-full bg-accent/18 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex items-center gap-5">
          <motion.div
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 14, delay: 0.1 }}
            className="grid place-items-center h-16 w-16 rounded-2xl bg-accent/20 text-accent shrink-0 ring-1 ring-accent/30 group-hover:bg-accent/30 transition-colors"
          >
            <Icon className="h-7 w-7" strokeWidth={2.25} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent font-bold mb-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inset-0 rounded-full bg-accent opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-accent" />
              </span>
              Do this next
            </div>
            <div className="font-display font-extrabold text-xl lg:text-2xl text-foreground leading-tight">
              {focus.title}
            </div>
            <div className="text-[13px] text-muted-foreground mt-1 max-w-md">{focus.body}</div>
          </div>
          <motion.div
            className="hidden sm:flex shrink-0 items-center justify-center h-10 w-10 rounded-full bg-accent/10 text-accent"
            initial={{ x: 0 }}
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATS ROW — three calm numbers, no card chrome                     */
/* ══════════════════════════════════════════════════════════════════ */
function StatsRow({ user, stats }: { user: AuthUser | null; stats: SellerStats }) {
  const items = [
    {
      icon: Eye,
      label: 'Listing views',
      value: stats.totalViews.toLocaleString(),
      numeric: stats.totalViews,
      hint: `${stats.activeListings} active listing${stats.activeListings === 1 ? '' : 's'}`,
      tone: 'primary' as const,
    },
    {
      icon: Star,
      label: 'Seller rating',
      value: stats.rating > 0 ? stats.rating.toFixed(2) : '—',
      numeric: undefined as number | undefined,
      hint:
        stats.rating > 0
          ? `${stats.completedOrders} verified reviews`
          : 'Complete first sale to earn reviews',
      tone: 'accent' as const,
    },
    {
      icon: Package,
      label: 'Lifetime sales',
      value: (user?.totalSales ?? 0).toString(),
      numeric: user?.totalSales ?? 0,
      hint: `$${(user?.totalEarned ?? 0).toFixed(0)} earned`,
      tone: 'success' as const,
    },
  ];

  const tones = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
  } as const;

  return (
    <section>
      <SectionHead eyebrow="This store" title="At a glance" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx, duration: 0.5, ease: EASE }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl bg-surface ring-1 ring-border p-5 lg:p-6 hover:ring-foreground/20 hover:shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.22)] transition-shadow cursor-default"
            >
              <motion.div
                whileHover={{ rotate: -6, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                className={`grid place-items-center h-10 w-10 rounded-xl mb-4 ${tones[it.tone]}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </motion.div>
              <div className="font-display font-extrabold text-3xl lg:text-[34px] tabular-nums leading-none mb-1.5">
                {it.numeric !== undefined ? <IntDisplay value={it.numeric} /> : it.value}
              </div>
              <div className="text-[13px] font-semibold text-foreground">{it.label}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{it.hint}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PIPELINE — 4-stage flow, single rail with connecting line          */
/* ══════════════════════════════════════════════════════════════════ */
function Pipeline({ stats }: { stats: SellerStats }) {
  const stages = [
    { key: 'paid', label: 'Paid', count: stats.pipeline.paid },
    { key: 'progress', label: 'In progress', count: stats.pipeline.inProgress },
    { key: 'delivered', label: 'Delivered', count: stats.pipeline.delivered },
    { key: 'completed', label: 'Released', count: stats.pipeline.completed },
  ];
  const total = stages.reduce((s, x) => s + x.count, 0);

  return (
    <section>
      <SectionHead
        eyebrow="Pipeline"
        title="Where your orders sit"
        action={{ href: '/orders', label: 'Open orders' }}
      />
      <div className="rounded-2xl bg-surface ring-1 ring-border p-5 lg:p-7">
        {total === 0 ? (
          <div className="text-center py-6">
            <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
              <Package className="h-5 w-5" />
            </div>
            <div className="font-semibold text-[14px] mb-1">No orders yet</div>
            <div className="text-[12.5px] text-muted-foreground">
              Buyers&apos; orders will appear here. Publish a listing to start.
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-[3px] rounded-full bg-foreground/8" aria-hidden />
            {/* Progress fill — animates from 0 on mount so the user sees
                the funnel "pour through" stages. */}
            <motion.div
              className="absolute left-0 top-5 h-[3px] rounded-full bg-gradient-to-r from-primary to-primary-hover"
              initial={{ width: 0 }}
              animate={{
                width: `${
                  ((stats.pipeline.completed +
                    stats.pipeline.delivered * 0.66 +
                    stats.pipeline.inProgress * 0.33) /
                    Math.max(1, total)) *
                  100
                }%`,
              }}
              transition={{ duration: 1, ease: EASE, delay: 0.15 }}
              aria-hidden
            />
            <div className="relative grid grid-cols-4 gap-2">
              {stages.map((s, idx) => {
                const active = s.count > 0;
                return (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.08, duration: 0.4, ease: EASE }}
                  >
                    <Link
                      href={`/orders?stage=${s.key}`}
                      className="group flex flex-col items-center text-center"
                    >
                      <motion.div
                        whileHover={{ scale: 1.12, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                        className={`
                          relative grid place-items-center h-10 w-10 rounded-full font-bold text-[13px] tabular-nums
                          ${
                            active
                              ? 'bg-primary text-primary-foreground ring-4 ring-primary/15 shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.6)]'
                              : 'bg-muted/40 text-muted-foreground ring-4 ring-background'
                          }
                        `}
                      >
                        <IntDisplay value={s.count} />
                      </motion.div>
                      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                        Step {idx + 1}
                      </div>
                      <div
                        className={`text-[12.5px] font-semibold mt-0.5 group-hover:text-primary transition-colors ${active ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {s.label}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  SETUP CHECKLIST — only renders if not all done                      */
/* ══════════════════════════════════════════════════════════════════ */
function SetupChecklist({ user, stats }: { user: AuthUser | null; stats: SellerStats }) {
  const steps = [
    { key: 'seller', label: 'Activate seller mode', done: !!user?.isSeller, href: '/' },
    {
      key: 'listing',
      label: 'Publish your first listing',
      done: stats.activeListings > 0,
      href: '/listings/new',
    },
    {
      key: 'profile',
      label: 'Complete profile + photo',
      done: !!user?.avatar && !!user?.name,
      href: '/profile',
    },
    { key: 'email', label: 'Verify your email', done: !!user?.emailVerified, href: '/profile' },
    {
      key: 'kyc',
      label: 'Start KYC for payouts',
      done: user?.kycStatus === 'VERIFIED' || user?.kycStatus === 'IN_REVIEW',
      href: '/profile',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  const pct = (completed / steps.length) * 100;

  return (
    <section>
      <SectionHead
        eyebrow="Setup"
        title="Finish setting up your store"
        subtitle={`${completed} of ${steps.length} steps complete`}
      />
      <div className="rounded-2xl bg-surface ring-1 ring-border p-5 lg:p-7">
        <div className="h-2 rounded-full bg-foreground/8 overflow-hidden mb-5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          />
        </div>
        <ul className="space-y-1.5">
          {steps.map((step, idx) => (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * idx, duration: 0.35, ease: EASE }}
            >
              <Link
                href={step.href}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-2.5 -mx-1 transition-colors
                  ${step.done ? 'opacity-60' : 'hover:bg-muted/25'}
                `}
              >
                {step.done ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.06 * idx + 0.1 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" strokeWidth={2.25} />
                  </motion.span>
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={2} />
                )}
                <span
                  className={`text-[13.5px] flex-1 ${step.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}
                >
                  {step.label}
                </span>
                {!step.done && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  ACTIVITY — clean timeline, no card-in-card                          */
/* ══════════════════════════════════════════════════════════════════ */
type FeedItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
  statusTone: 'success' | 'warning' | 'muted';
  href: string;
  ts: string;
  icon: typeof Tag;
};

function Activity({
  listings,
  offers,
  orders,
}: {
  listings: SellerListing[];
  offers: SellerOffer[];
  orders: SellerOrderListItem[];
}) {
  const feed: FeedItem[] = [
    ...listings.slice(0, 4).map<FeedItem>((l) => ({
      id: `l-${l.id}`,
      title: l.title,
      meta: `$${l.price.toFixed(2)} · ${l.game.name}`,
      status: l.status,
      statusTone:
        l.status === 'ACTIVE' ? 'success' : l.status === 'DRAFT' ? 'warning' : 'muted',
      href: `/listings`,
      ts: l.createdAt,
      icon: Tag,
    })),
    ...offers.slice(0, 4).map<FeedItem>((o) => ({
      id: `o-${o.id}`,
      title: o.request.title,
      meta: `$${o.price.toFixed(2)} · ${o.deliveryHours}h delivery`,
      status: o.status,
      statusTone:
        o.status === 'ACCEPTED' ? 'success' : o.status === 'PENDING' ? 'warning' : 'muted',
      href: '/offers',
      ts: o.createdAt,
      icon: Zap,
    })),
    ...orders.slice(0, 4).map<FeedItem>((o) => ({
      id: `r-${o.id}`,
      title: o.paymentMetadata?.snapshotTitle ?? o.customRequest?.title ?? `Order ${o.orderNumber}`,
      meta: `$${o.amount.toFixed(2)} · ${o.buyer.username ?? o.buyer.name ?? '—'}`,
      status: o.status,
      statusTone:
        o.status === 'COMPLETED' || o.status === 'CONFIRMED'
          ? 'success'
          : o.status === 'PAID' || o.status === 'IN_PROGRESS' || o.status === 'DELIVERED'
            ? 'warning'
            : 'muted',
      href: `/orders/${o.id}`,
      ts: o.createdAt,
      icon: Package,
    })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 6);

  return (
    <section>
      <SectionHead eyebrow="Activity" title="Latest across your store" />
      {feed.length === 0 ? (
        <div className="rounded-2xl bg-surface ring-1 ring-border p-10 text-center">
          <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="font-semibold text-[14px] mb-1">Nothing yet</div>
          <div className="text-[12.5px] text-muted-foreground mb-4">
            Create your first listing or bid on a request to fill this feed.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
          <ul className="divide-y divide-border">
            {feed.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * idx, duration: 0.35, ease: EASE }}
                >
                  <Link
                    href={item.href}
                    className="group flex items-center gap-4 p-4 lg:p-5 hover:bg-muted/15 active:bg-muted/25 transition-colors"
                  >
                    <motion.div
                      whileHover={{ rotate: -8, scale: 1.08 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                      className="grid place-items-center h-10 w-10 rounded-xl bg-muted/30 text-muted-foreground group-hover:text-foreground group-hover:bg-muted/45 transition-colors shrink-0"
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate">{item.meta}</div>
                    </div>
                    <Badge
                      variant={
                        item.statusTone === 'success'
                          ? 'default'
                          : item.statusTone === 'warning'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="text-[10px] font-mono uppercase tracking-wider shrink-0 hidden sm:inline-flex"
                    >
                      {item.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  SECTION HEAD                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function SectionHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
          {eyebrow}
        </div>
        <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary border-b border-primary/30 hover:border-primary pb-0.5 transition-all"
        >
          {action.label}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  FOCUS PICKER — one urgent task only                                 */
/* ══════════════════════════════════════════════════════════════════ */
interface Focus {
  icon: typeof Truck;
  title: string;
  body: string;
  href: string;
}

function pickFocus(stats: SellerStats): Focus | null {
  if (stats.toDeliver > 0) {
    return {
      icon: Truck,
      title: `Deliver ${stats.toDeliver} paid order${stats.toDeliver === 1 ? '' : 's'}`,
      body: 'Same-day delivery is the GETX standard. Late deliveries hurt your seller rating.',
      href: '/orders',
    };
  }
  if (stats.unreadMessages > 0) {
    return {
      icon: MessageSquare,
      title: `Reply to ${stats.unreadMessages} buyer message${stats.unreadMessages === 1 ? '' : 's'}`,
      body: 'Replies within 30 minutes convert 3× more often. Buyers shop where sellers are awake.',
      href: '/messages',
    };
  }
  if (stats.activeListings === 0) {
    return {
      icon: Plus,
      title: 'Publish your first listing',
      body: 'Sellers with 3+ active drops earn twice the views in their first week. Start with what you know best.',
      href: '/listings/new',
    };
  }
  if (stats.draftListings > 0) {
    return {
      icon: Tag,
      title: `Publish ${stats.draftListings} draft${stats.draftListings === 1 ? '' : 's'}`,
      body: "Drafts aren't visible to buyers. Polish + publish to start earning.",
      href: '/listings',
    };
  }
  if (stats.activeListings < 3) {
    return {
      icon: Sparkles,
      title: `Add ${3 - stats.activeListings} more drop${3 - stats.activeListings === 1 ? '' : 's'}`,
      body: 'Stores with 3+ active drops show up in more searches and rank higher.',
      href: '/listings/new',
    };
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATS DERIVATION                                                    */
/* ══════════════════════════════════════════════════════════════════ */
interface SellerStats {
  activeListings: number;
  draftListings: number;
  pausedListings: number;
  pendingOffers: number;
  acceptedOffers: number;
  totalViews: number;
  totalSold: number;
  completedOrders: number;
  toDeliver: number;
  unreadMessages: number;
  urgentCount: number;
  rating: number;
  pipeline: {
    paid: number;
    inProgress: number;
    delivered: number;
    completed: number;
  };
}

function deriveStats(
  user: AuthUser | null,
  listings: SellerListing[] | undefined,
  offers: SellerOffer[] | undefined,
  orders: SellerOrderListItem[] | undefined,
  convs:
    | Array<{ buyerId: string; sellerId: string; buyerUnread: number; sellerUnread: number }>
    | undefined,
): SellerStats {
  const ls = listings ?? [];
  const os = offers ?? [];
  const rs = orders ?? [];

  const activeListings = ls.filter((l) => l.status === 'ACTIVE').length;
  const draftListings = ls.filter((l) => l.status === 'DRAFT').length;
  const pausedListings = ls.filter((l) => l.status === 'PAUSED').length;
  const pendingOffers = os.filter((o) => o.status === 'PENDING').length;
  const acceptedOffers = os.filter((o) => o.status === 'ACCEPTED').length;
  const totalViews = ls.reduce((s, l) => s + (l.viewCount ?? 0), 0);
  const totalSold = ls.reduce((s, l) => s + (l.soldCount ?? 0), 0);
  const completedOrders = rs.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'CONFIRMED',
  ).length;
  const toDeliver = rs.filter((o) => o.status === 'PAID' || o.status === 'IN_PROGRESS').length;
  const unreadMessages =
    convs?.reduce(
      (sum, c) => sum + (user?.id === c.buyerId ? c.buyerUnread : c.sellerUnread),
      0,
    ) ?? 0;

  return {
    activeListings,
    draftListings,
    pausedListings,
    pendingOffers,
    acceptedOffers,
    totalViews,
    totalSold,
    completedOrders,
    toDeliver,
    unreadMessages,
    urgentCount: toDeliver + unreadMessages,
    rating: user?.sellerRating ?? 0,
    pipeline: {
      paid: rs.filter((o) => o.status === 'PAID').length,
      inProgress: rs.filter((o) => o.status === 'IN_PROGRESS').length,
      delivered: rs.filter((o) => o.status === 'DELIVERED').length,
      completed: rs.filter((o) => o.status === 'COMPLETED' || o.status === 'CONFIRMED').length,
    },
  };
}

/* Wallet icon unused in render but referenced by pipeline stages for
   parity with prior version — keep it shipped to avoid TS unused. */
void Wallet;
