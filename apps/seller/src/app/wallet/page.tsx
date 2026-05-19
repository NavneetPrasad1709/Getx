'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Download,
  Gift,
  Info,
  Landmark,
  Loader2,
  Lock,
  PiggyBank,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet as WalletIcon,
  Zap,
} from 'lucide-react';
import { Skeleton, motion, toast, useReducedMotion } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useAuth } from '@/hooks/use-auth';
import {
  useWallet,
  usePayoutsStatus,
  useStartPayoutOnboarding,
  type WalletTxn,
  type WalletTxnType,
} from '@/hooks/use-wallet';

/* GETX Seller — Wallet.
   ─────────────────────────────────────────────────────────────────────
   Money pages create or destroy trust. Built around three jobs:

     1. See what I have right now            → hero balance card
     2. Get my money out                     → withdraw button + payout setup
     3. Verify every dollar is accounted for → transaction ledger

   Inspired by eldorado.gg's prominent balance + transaction stream
   and zeusx's clean payout-setup card, with extra coaching for
   first-time sellers who haven't connected a payout method yet. */

const EASE = [0.22, 1, 0.36, 1] as const;

type LedgerFilter = 'all' | 'earnings' | 'payouts' | 'adjustments';

const LEDGER_FILTERS: { key: LedgerFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'adjustments', label: 'Other' },
];

function matchesLedger(t: WalletTxn, f: LedgerFilter): boolean {
  if (f === 'all') return true;
  if (f === 'earnings')
    return t.type === 'ORDER_RELEASED' || t.type === 'BONUS' || t.type === 'CASHBACK' || t.type === 'REFERRAL';
  if (f === 'payouts')
    return t.type === 'WITHDRAWAL' || t.type === 'WITHDRAWAL_FEE';
  return t.type === 'REFUND' || t.type === 'CHARGEBACK' || t.type === 'ADJUSTMENT' || t.type === 'SPEND';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Count-up — identical pattern to dashboard. */
function useCountUp(target: number, durationMs = 800): number {
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
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce, durationMs]);

  return value;
}

function MoneyBig({ value, className = '' }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  const [intPart, decPart] = animated.toFixed(2).split('.');
  return (
    <span className={`font-display font-extrabold tabular-nums leading-none ${className}`}>
      ${Number(intPart).toLocaleString('en-US')}
      <span className="text-current opacity-50 text-[55%] align-baseline">.{decPart}</span>
    </span>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const isAuthed = !!user;
  const wallet = useWallet(isAuthed);
  const payouts = usePayoutsStatus(isAuthed);
  const startOnboarding = useStartPayoutOnboarding();

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [search, setSearch] = useState('');

  /* Source the seller balance from the live /wallet snapshot, falling
     back to the cached value on the auth user if the request is in
     flight. Same for pending. */
  const sellerWallet = wallet.data?.sellerWallet ?? user?.sellerWallet ?? 0;
  const pending = wallet.data?.pendingEarnings ?? user?.pendingEarnings ?? 0;
  const totalEarned = wallet.data?.totalEarned ?? user?.totalEarned ?? 0;

  const ledger = useMemo(() => wallet.data?.ledger ?? [], [wallet.data?.ledger]);

  /* This-month earnings for the trend chip. */
  const thisMonthEarnings = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return ledger
      .filter(
        (t) =>
          (t.type === 'ORDER_RELEASED' || t.type === 'BONUS' || t.type === 'REFERRAL') &&
          new Date(t.createdAt) >= start,
      )
      .reduce((s, t) => s + t.amount, 0);
  }, [ledger]);

  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledger
      .filter((t) => matchesLedger(t, ledgerFilter))
      .filter((t) =>
        q
          ? t.description.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q) ||
            (t.orderId ?? '').toLowerCase().includes(q)
          : true,
      );
  }, [ledger, ledgerFilter, search]);

  const canWithdraw =
    !!payouts.data?.payoutsEnabled && sellerWallet > 0;

  const kycStatus = user?.kycStatus ?? 'NONE';
  const kycOk = kycStatus === 'APPROVED';
  const payoutOk = !!payouts.data?.payoutsEnabled;
  const allSetupDone = kycOk && payoutOk;

  const handleStartOnboarding = async () => {
    try {
      const res = await startOnboarding.mutateAsync({
        returnPath: '/wallet?onboarded=1',
        refreshPath: '/wallet?refresh=1',
      });
      window.location.href = res.url;
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not start payout setup. Try again.');
    }
  };

  const handleWithdrawClick = () => {
    if (!allSetupDone) {
      toast.error('Finish payout setup first');
      return;
    }
    if (sellerWallet <= 0) {
      toast.error('No funds to withdraw');
      return;
    }
    // Withdrawal modal — kept inline-light for now. Production rail is
    // Stripe Connect Express; clicking takes them to a hosted dashboard.
    // Until that's wired, point them at the Stripe dashboard via account link.
    void handleStartOnboarding();
  };

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto space-y-6 lg:space-y-8"
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
              Earnings
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
              Wallet
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">
              Every dollar that moves through your store, on one page.
            </p>
          </div>
        </motion.div>

        {/* ── HERO BALANCE CARD ──────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
        >
          <HeroBalance
            available={sellerWallet}
            pending={pending}
            totalEarned={totalEarned}
            monthEarnings={thisMonthEarnings}
            canWithdraw={canWithdraw}
            onWithdraw={handleWithdrawClick}
            isLoading={wallet.isLoading}
            onRefresh={() => wallet.refetch()}
          />
        </motion.div>

        {/* ── PAYOUT SETUP CHECKLIST (hides when complete) ───────────── */}
        {!allSetupDone && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          >
            <PayoutSetup
              kycOk={kycOk}
              kycStatus={kycStatus}
              payoutOk={payoutOk}
              connectStarted={!!payouts.data?.detailsSubmitted}
              onStartPayout={handleStartOnboarding}
              starting={startOnboarding.isPending}
            />
          </motion.div>
        )}

        {/* ── TRANSACTION LEDGER ─────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
        >
          <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1">
                Ledger
              </div>
              <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight">
                Transaction history
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ledger"
                  className="h-9 w-44 sm:w-56 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
                />
              </div>
              <button
                type="button"
                disabled
                title="CSV export coming soon"
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-muted/25 ring-1 ring-border text-[12.5px] font-semibold text-muted-foreground cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto -mx-1 px-1 pb-0.5">
            {LEDGER_FILTERS.map((f) => {
              const active = ledgerFilter === f.key;
              const count = ledger.filter((t) => matchesLedger(t, f.key)).length;
              return (
                <motion.button
                  key={f.key}
                  type="button"
                  onClick={() => setLedgerFilter(f.key)}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                    ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  {active && (
                    <motion.span
                      layoutId="wallet-filter-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {f.label}
                  <span className="inline-flex items-center justify-center h-4 min-w-5 px-1 rounded-full text-[10px] font-mono font-bold tabular-nums bg-muted/30 text-foreground/85">
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Ledger */}
          {wallet.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : filteredLedger.length === 0 ? (
            <LedgerEmpty hasAny={ledger.length > 0} filter={ledgerFilter} />
          ) : (
            <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
              <ul className="divide-y divide-border">
                {filteredLedger.map((t, idx) => (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx, 8) * 0.03, duration: 0.3, ease: EASE }}
                  >
                    <LedgerRow txn={t} />
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* ── TRUST FOOTER ───────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="rounded-2xl bg-muted/20 ring-1 ring-border p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-success/12 text-success shrink-0">
              <Shield className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="text-[12.5px] text-muted-foreground leading-relaxed">
              Funds are held in escrow until the buyer confirms delivery or the 3-day
              auto-release window passes. GETX charges 8% per completed sale.{' '}
              <Link href="https://getx.gg/how-it-works" target="_blank" className="text-primary font-semibold inline-flex items-center gap-0.5">
                How escrow works
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  HERO BALANCE CARD                                                   */
/* ══════════════════════════════════════════════════════════════════ */
function HeroBalance({
  available,
  pending,
  totalEarned,
  monthEarnings,
  canWithdraw,
  onWithdraw,
  isLoading,
  onRefresh,
}: {
  available: number;
  pending: number;
  totalEarned: number;
  monthEarnings: number;
  canWithdraw: boolean;
  onWithdraw: () => void;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/12 via-surface to-accent/6 ring-1 ring-primary/20 p-6 lg:p-10">
      {/* Decorative blobs */}
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-accent/12 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold">
            Available to withdraw
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh wallet"
            className="grid place-items-center h-8 w-8 rounded-full bg-surface/60 ring-1 ring-border hover:bg-surface hover:ring-foreground/15 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mb-2">
          <MoneyBig
            value={available}
            className="text-[44px] sm:text-[64px] lg:text-[80px] text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 mb-7 flex-wrap">
          {monthEarnings > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/12 ring-1 ring-success/20 text-success font-mono text-[10.5px] uppercase tracking-[0.18em] font-bold">
              <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
              ${monthEarnings.toFixed(0)} this month
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Lock className="h-3 w-3" strokeWidth={2.5} />
            Escrow-protected
          </span>
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-7">
          <motion.button
            type="button"
            onClick={onWithdraw}
            whileHover={canWithdraw ? { y: -2 } : undefined}
            whileTap={canWithdraw ? { scale: 0.97 } : undefined}
            disabled={!canWithdraw}
            className={`
              inline-flex items-center gap-1.5 h-12 px-6 rounded-full text-[13.5px] font-bold tracking-tight transition-all
              ${
                canWithdraw
                  ? 'bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_12px_28px_-6px_hsl(var(--primary)/0.55)] hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]'
                  : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
              }
            `}
          >
            <ArrowDownToLine className="h-4 w-4" strokeWidth={2.5} />
            Withdraw funds
          </motion.button>
          <button
            type="button"
            disabled
            title="Transaction CSV export coming soon"
            className="inline-flex items-center gap-1.5 h-12 px-5 rounded-full bg-surface ring-1 ring-border text-foreground/85 text-[13px] font-semibold opacity-60 cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Download statement
          </button>
        </div>

        {/* Pending + Lifetime split */}
        <div className="grid grid-cols-2 gap-6 sm:gap-10 pt-6 border-t border-border/60">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
                Pending in escrow
              </span>
            </div>
            <MoneyBig value={pending} className="text-2xl sm:text-3xl text-foreground/80" />
            <div className="text-[11px] text-muted-foreground mt-1">
              Releases when buyers confirm
            </div>
          </div>
          <div className="border-l border-border pl-6">
            <div className="flex items-center gap-1.5 mb-1.5">
              <PiggyBank className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
                Lifetime earned
              </span>
            </div>
            <MoneyBig value={totalEarned} className="text-2xl sm:text-3xl text-foreground/80" />
            <div className="text-[11px] text-muted-foreground mt-1">
              All-time payouts + escrow released
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PAYOUT SETUP — gated checklist                                      */
/* ══════════════════════════════════════════════════════════════════ */
function PayoutSetup({
  kycOk,
  kycStatus,
  payoutOk,
  connectStarted,
  onStartPayout,
  starting,
}: {
  kycOk: boolean;
  kycStatus: string;
  payoutOk: boolean;
  connectStarted: boolean;
  onStartPayout: () => void;
  starting: boolean;
}) {
  const steps = [
    {
      key: 'kyc',
      icon: BadgeCheck,
      label: 'Verify your identity',
      hint:
        kycStatus === 'IN_REVIEW'
          ? 'Sumsub is reviewing your documents.'
          : 'Quick KYC via Sumsub. Required by our payment partners.',
      done: kycOk,
      action: 'Start KYC',
      href: '/profile',
      state:
        kycStatus === 'IN_REVIEW' ? 'pending' : kycOk ? 'done' : 'todo',
    },
    {
      key: 'payout',
      icon: Landmark,
      label: 'Connect your payout method',
      hint: 'Bank account via Stripe Connect Express. Money lands in 1–2 business days.',
      done: payoutOk,
      action: connectStarted ? 'Finish setup' : 'Set up payouts',
      onClick: onStartPayout,
      state: payoutOk ? 'done' : connectStarted ? 'pending' : 'todo',
    },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const pct = (completedCount / steps.length) * 100;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/8 via-surface to-surface ring-1 ring-accent/20 p-5 lg:p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent">
          <Sparkles className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent font-bold">
            Unlock withdrawals
          </div>
          <h3 className="font-display text-lg font-bold leading-tight">
            {completedCount === 0 ? 'Two steps to get paid' : 'One step left'}
          </h3>
        </div>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
      </div>

      <div className="h-2 rounded-full bg-foreground/8 overflow-hidden mb-4 mt-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + idx * 0.08, duration: 0.35, ease: EASE }}
              className={`
                flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 transition-colors
                ${s.state === 'done' ? 'bg-success/8 ring-1 ring-success/20' : 'bg-surface ring-1 ring-border'}
              `}
            >
              <div
                className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 ${
                  s.state === 'done'
                    ? 'bg-success/15 text-success'
                    : s.state === 'pending'
                      ? 'bg-warning/15 text-warning'
                      : 'bg-accent/15 text-accent'
                }`}
              >
                {s.state === 'done' ? (
                  <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2.5} />
                ) : s.state === 'pending' ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13.5px] font-semibold ${
                    s.state === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {s.label}
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">{s.hint}</div>
              </div>

              {s.state !== 'done' && (
                <>
                  {s.href ? (
                    <Link
                      href={s.href}
                      className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-accent text-accent-foreground text-[12px] font-bold whitespace-nowrap hover:opacity-90 transition-opacity"
                    >
                      {s.action}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={s.onClick}
                      disabled={starting}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-accent text-accent-foreground text-[12px] font-bold whitespace-nowrap hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {starting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Opening…
                        </>
                      ) : (
                        <>
                          {s.action}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </motion.button>
                  )}
                </>
              )}
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-4 pt-4 border-t border-border/60 flex items-start gap-2 text-[11.5px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Stripe Connect Express handles KYC + payouts in one onboarding. Once approved,
          withdrawals settle to your linked bank in 1–2 business days.
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  LEDGER ROW                                                          */
/* ══════════════════════════════════════════════════════════════════ */
const TXN_META: Record<
  WalletTxnType,
  { label: string; icon: typeof ArrowDownLeft; tone: 'success' | 'primary' | 'accent' | 'warning' | 'error' | 'muted'; direction: '+' | '-' }
> = {
  ORDER_RELEASED: { label: 'Order released', icon: ArrowDownLeft, tone: 'success', direction: '+' },
  CASHBACK: { label: 'Cashback', icon: Gift, tone: 'accent', direction: '+' },
  BONUS: { label: 'Bonus', icon: Sparkles, tone: 'accent', direction: '+' },
  REFERRAL: { label: 'Referral', icon: Gift, tone: 'accent', direction: '+' },
  WITHDRAWAL: { label: 'Withdrawal', icon: ArrowDownToLine, tone: 'primary', direction: '-' },
  WITHDRAWAL_FEE: { label: 'Payout fee', icon: ArrowDownToLine, tone: 'muted', direction: '-' },
  REFUND: { label: 'Refund', icon: RefreshCw, tone: 'warning', direction: '-' },
  CHARGEBACK: { label: 'Chargeback', icon: AlertCircle, tone: 'error', direction: '-' },
  ADJUSTMENT: { label: 'Adjustment', icon: Info, tone: 'muted', direction: '+' },
  SPEND: { label: 'Wallet spend', icon: WalletIcon, tone: 'muted', direction: '-' },
};

function LedgerRow({ txn }: { txn: WalletTxn }) {
  const meta = TXN_META[txn.type];
  const Icon = meta.icon;
  const tones: Record<string, { bg: string; fg: string }> = {
    success: { bg: 'bg-success/12', fg: 'text-success' },
    primary: { bg: 'bg-primary/12', fg: 'text-primary' },
    accent: { bg: 'bg-accent/12', fg: 'text-accent' },
    warning: { bg: 'bg-warning/12', fg: 'text-warning' },
    error: { bg: 'bg-error/12', fg: 'text-error' },
    muted: { bg: 'bg-muted/30', fg: 'text-muted-foreground' },
  };
  const tone = tones[meta.tone];
  const isPositive = meta.direction === '+';
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-muted/15 transition-colors group">
      <div
        className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${tone.bg} ${tone.fg} group-hover:scale-105 transition-transform`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[13.5px] text-foreground">{meta.label}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {timeAgo(txn.createdAt)}
          </span>
        </div>
        <div className="text-[12px] text-muted-foreground truncate mt-0.5">
          {txn.description}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={`font-display font-bold text-[15px] tabular-nums leading-none ${isPositive ? 'text-success' : 'text-foreground/85'}`}
        >
          {isPositive ? '+' : '−'}${Math.abs(txn.amount).toFixed(2)}
        </div>
        <div className="text-[10.5px] font-mono text-muted-foreground tabular-nums mt-0.5">
          Bal ${txn.balanceAfter.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function LedgerEmpty({ hasAny, filter }: { hasAny: boolean; filter: LedgerFilter }) {
  if (!hasAny) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border p-10 lg:p-12 text-center">
        <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/12 text-primary mx-auto mb-3">
          <Zap className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div className="font-display font-bold text-lg mb-1">No transactions yet</div>
        <div className="text-[13px] text-muted-foreground max-w-sm mx-auto">
          Your earnings and payouts will show up here. Complete your first sale to get started.
        </div>
      </div>
    );
  }
  const labels: Record<LedgerFilter, string> = {
    all: 'transactions',
    earnings: 'earnings',
    payouts: 'payouts',
    adjustments: 'adjustments',
  };
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border p-10 text-center">
      <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
        <Circle className="h-5 w-5" />
      </div>
      <div className="font-display font-bold text-[14px] mb-0.5">No {labels[filter]} yet</div>
      <div className="text-[12.5px] text-muted-foreground">Try a different filter.</div>
    </div>
  );
}
