'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Flame,
  ImageOff,
  Inbox,
  MessageSquare,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';
import { Skeleton, motion } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import {
  useMySellerOrders,
  type EscrowStatus,
  type OrderStatus,
  type SellerOrderListItem,
} from '@/hooks/use-seller-orders';

/* GETX Seller — Orders queue.
   ─────────────────────────────────────────────────────────────────────
   The single most operationally-critical screen for the seller. Built
   around answering one question fast: "what do I need to do right
   now?". Inspired by eldorado.gg's kanban-style buckets and zeusx's
   action-driven cards, then sharpened with:

     • Action-aware CTAs per status (Start delivery, Mark delivered,
       Awaiting confirm, View receipt, Open dispute)
     • Live auto-release countdown on DELIVERED orders
     • "Need it within X" urgency chip on PAID orders older than 6h
     • Stat strip showing money in/out of escrow
     • Smart filter pills with live counts, query-param routable

   Visual language matches dashboard + listings: stagger-reveal cards,
   sticky toolbar, layout-id pill highlight, count-up amounts in stats.
*/

const EASE = [0.22, 1, 0.36, 1] as const;

type Filter = 'all' | 'action' | 'progress' | 'awaiting' | 'done' | 'issues';

const FILTERS: { key: Filter; label: string; tone: string }[] = [
  { key: 'all', label: 'All', tone: 'bg-muted/40 text-foreground' },
  { key: 'action', label: 'Needs action', tone: 'bg-hot/15 text-hot' },
  { key: 'progress', label: 'In progress', tone: 'bg-primary/15 text-primary' },
  { key: 'awaiting', label: 'Awaiting confirm', tone: 'bg-accent/15 text-accent' },
  { key: 'done', label: 'Done', tone: 'bg-success/15 text-success' },
  { key: 'issues', label: 'Issues', tone: 'bg-error/15 text-error' },
];

/* Map URL ?stage= from the dashboard pipeline → filter pill. */
const STAGE_TO_FILTER: Record<string, Filter> = {
  paid: 'action',
  progress: 'progress',
  delivered: 'awaiting',
  completed: 'done',
};

function matchesFilter(o: SellerOrderListItem, f: Filter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'action':
      return o.status === 'PAID';
    case 'progress':
      return o.status === 'IN_PROGRESS';
    case 'awaiting':
      return o.status === 'DELIVERED';
    case 'done':
      return o.status === 'COMPLETED' || o.status === 'CONFIRMED';
    case 'issues':
      return o.status === 'DISPUTED' || o.status === 'REFUNDED' || o.status === 'CANCELLED';
  }
}

function orderTitle(o: SellerOrderListItem): string {
  return (
    o.paymentMetadata?.snapshotTitle ??
    o.customRequest?.title ??
    `Order ${o.orderNumber}`
  );
}

/* Relative time — "2h ago", "3d ago". Plain JS, locale-stable. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

/* Hours since payment captured — used to flag stale unfilfilled orders. */
function hoursSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useMySellerOrders();
  const searchParams = useSearchParams();
  const initialStage = searchParams.get('stage') ?? '';
  const [filter, setFilter] = useState<Filter>(STAGE_TO_FILTER[initialStage] ?? 'all');
  const [query, setQuery] = useState('');

  /* If user navigates via the dashboard pipeline ?stage=…, react to it. */
  useEffect(() => {
    const next = STAGE_TO_FILTER[searchParams.get('stage') ?? ''];
    if (next) setFilter(next);
  }, [searchParams]);

  const all = useMemo(() => orders ?? [], [orders]);

  const summary = useMemo(() => {
    const counts: Record<Filter, number> = {
      all: all.length,
      action: 0,
      progress: 0,
      awaiting: 0,
      done: 0,
      issues: 0,
    };
    let earningsInEscrow = 0;
    let earningsAvailable = 0;
    let staleCount = 0;
    for (const o of all) {
      for (const f of FILTERS) {
        if (f.key !== 'all' && matchesFilter(o, f.key)) counts[f.key] += 1;
      }
      if (o.escrowStatus === 'HELD') earningsInEscrow += o.sellerAmount;
      if (o.escrowStatus === 'RELEASED') earningsAvailable += o.sellerAmount;
      if (o.status === 'PAID' && hoursSince(o.paymentCapturedAt) >= 6) staleCount += 1;
    }
    return { counts, earningsInEscrow, earningsAvailable, staleCount };
  }, [all]);

  const filtered = useMemo(() => {
    const list = all.filter((o) => matchesFilter(o, filter));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => {
      const title = orderTitle(o).toLowerCase();
      const num = o.orderNumber.toLowerCase();
      const buyer = (o.buyer.username ?? o.buyer.name ?? '').toLowerCase();
      return title.includes(q) || num.includes(q) || buyer.includes(q);
    });
  }, [all, filter, query]);

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
        }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-6 lg:space-y-8"
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
                Fulfilment queue
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                Orders
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                Deliver fast, get paid. Buyers expect same-day on GETX.
              </p>
            </div>
            {summary.counts.action > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 bg-hot/12 ring-1 ring-hot/25 text-hot"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inset-0 rounded-full bg-hot opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-hot" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold">
                  {summary.counts.action} need{summary.counts.action === 1 ? 's' : ''} action
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── STAT STRIP ─────────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatTile
            icon={Flame}
            label="Needs action"
            value={summary.counts.action}
            tone="hot"
            hint={
              summary.staleCount > 0
                ? `${summary.staleCount} older than 6h`
                : 'New paid orders'
            }
          />
          <StatTile
            icon={Truck}
            label="In progress"
            value={summary.counts.progress}
            tone="primary"
            hint="You're fulfilling"
          />
          <StatTile
            icon={Clock}
            label="In escrow"
            value={`$${summary.earningsInEscrow.toFixed(0)}`}
            tone="accent"
            hint={`${summary.counts.awaiting} awaiting confirm`}
          />
          <StatTile
            icon={CheckCircle2}
            label="Lifetime done"
            value={summary.counts.done}
            tone="success"
            hint={`$${summary.earningsAvailable.toFixed(0)} released`}
          />
        </motion.div>

        {/* ── FILTER + SEARCH STICKY BAR ─────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {FILTERS.map((f) => {
                const count = summary.counts[f.key];
                const active = filter === f.key;
                return (
                  <motion.button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                      ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                    `}
                  >
                    {active && (
                      <motion.span
                        layoutId="orders-filter-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    {f.label}
                    <span className={`inline-flex items-center justify-center h-4 min-w-5 px-1 rounded-full text-[10px] font-mono font-bold tabular-nums ${f.tone}`}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order # or buyer"
                className="h-9 w-48 sm:w-64 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} hasAny={all.length > 0} query={query} />
        ) : (
          <div className="space-y-3">
            {filtered.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: EASE }}
                layout
              >
                <OrderCard order={order} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STAT TILE                                                          */
/* ══════════════════════════════════════════════════════════════════ */
function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Truck;
  label: string;
  value: string | number;
  hint: string;
  tone: 'primary' | 'accent' | 'success' | 'hot';
}) {
  const tones = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
    hot: 'text-hot bg-hot/10',
  } as const;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl bg-surface ring-1 ring-border p-4 lg:p-5 hover:ring-foreground/15 transition-shadow hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.2)]"
    >
      <div className={`grid place-items-center h-9 w-9 rounded-xl mb-3 ${tones[tone]}`}>
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="font-display font-extrabold text-2xl lg:text-[28px] tabular-nums leading-none mb-1">
        {value}
      </div>
      <div className="text-[12px] font-semibold text-foreground">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  ORDER CARD — action-driven, status-aware                            */
/* ══════════════════════════════════════════════════════════════════ */
function OrderCard({ order }: { order: SellerOrderListItem }) {
  const status = order.status;
  const buyerLabel = order.buyer.username ?? order.buyer.name ?? 'Buyer';
  const initials = buyerLabel.slice(0, 2).toUpperCase();
  const meta = STATUS_META[status];
  const isUrgent = status === 'PAID' && hoursSince(order.paymentCapturedAt) >= 6;

  return (
    <Link
      href={`/orders/${order.id}`}
      className={`
        relative group block rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${isUrgent ? 'ring-hot/40 hover:ring-hot/60' : 'ring-border hover:ring-foreground/20'}
        hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.22)]
      `}
    >
      {/* Status accent stripe */}
      <div
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.stripe}`}
      />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-muted/40 overflow-hidden shrink-0 ring-1 ring-border">
            {order.productListing?.images?.[0] ? (
              <Image
                src={order.productListing.images[0]}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <ImageOff className="h-5 w-5 opacity-50" />
              </div>
            )}
          </div>

          {/* Middle — title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusPill status={status} />
              <EscrowChip status={order.escrowStatus} />
              {isUrgent && <UrgentChip />}
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {order.orderNumber}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                · {timeAgo(order.createdAt)}
              </span>
            </div>
            <h3 className="font-display font-bold text-[15px] leading-snug truncate mb-1.5">
              {orderTitle(order)}
            </h3>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <div className="grid place-items-center h-5 w-5 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[9px] shrink-0">
                {initials}
              </div>
              <span className="truncate">{buyerLabel}</span>
              {status === 'DELIVERED' && order.deliveredAt && (
                <AutoReleaseChip deliveredAt={order.deliveredAt} />
              )}
            </div>
          </div>

          {/* Right — money + CTA */}
          <div className="hidden sm:flex flex-col items-end shrink-0 gap-2">
            <div className="text-right">
              <div className="font-display font-extrabold text-[20px] tabular-nums leading-none">
                ${order.buyerTotal.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                You earn <span className="text-success font-bold tabular-nums">${order.sellerAmount.toFixed(2)}</span>
              </div>
            </div>
            <ActionCta status={status} />
          </div>
        </div>

        {/* Mobile money + CTA */}
        <div className="sm:hidden mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div>
            <div className="font-display font-extrabold text-[18px] tabular-nums leading-none">
              ${order.buyerTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              You earn <span className="text-success font-bold tabular-nums">${order.sellerAmount.toFixed(2)}</span>
            </div>
          </div>
          <ActionCta status={status} />
        </div>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATUS META + PILLS                                                 */
/* ══════════════════════════════════════════════════════════════════ */
const STATUS_META: Record<
  OrderStatus,
  { label: string; pill: string; stripe: string }
> = {
  PENDING: {
    label: 'Pending',
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
  },
  PAID: {
    label: 'New · Paid',
    pill: 'bg-hot/15 text-hot ring-hot/25',
    stripe: 'bg-hot',
  },
  IN_PROGRESS: {
    label: 'In progress',
    pill: 'bg-primary/15 text-primary ring-primary/25',
    stripe: 'bg-primary',
  },
  DELIVERED: {
    label: 'Delivered',
    pill: 'bg-accent/15 text-accent ring-accent/25',
    stripe: 'bg-accent',
  },
  CONFIRMED: {
    label: 'Confirmed',
    pill: 'bg-success/15 text-success ring-success/25',
    stripe: 'bg-success',
  },
  COMPLETED: {
    label: 'Completed',
    pill: 'bg-success/15 text-success ring-success/25',
    stripe: 'bg-success',
  },
  CANCELLED: {
    label: 'Cancelled',
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
  },
  DISPUTED: {
    label: 'Disputed',
    pill: 'bg-error/15 text-error ring-error/25',
    stripe: 'bg-error',
  },
  REFUNDED: {
    label: 'Refunded',
    pill: 'bg-warning/15 text-warning ring-warning/25',
    stripe: 'bg-warning',
  },
};

function StatusPill({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  const live = status === 'PAID' || status === 'IN_PROGRESS';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${m.pill} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      {live && <span className="h-1 w-1 rounded-full bg-current animate-pulse" />}
      {m.label}
    </span>
  );
}

function EscrowChip({ status }: { status: EscrowStatus }) {
  const labels: Record<EscrowStatus, { label: string; tone: string }> = {
    PENDING: { label: 'Pre-escrow', tone: 'text-muted-foreground' },
    HELD: { label: 'In escrow', tone: 'text-accent' },
    RELEASED: { label: 'Released', tone: 'text-success' },
    REFUNDED: { label: 'Refunded', tone: 'text-warning' },
    PARTIAL: { label: 'Partial', tone: 'text-warning' },
  };
  const l = labels[status];
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold ${l.tone}`}
    >
      <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
      {l.label}
    </span>
  );
}

function UrgentChip() {
  return (
    <motion.span
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-hot text-hot-foreground font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold shadow-[0_4px_12px_-3px_hsl(var(--hot)/0.5)]"
    >
      <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
      Urgent
    </motion.span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  ACTION CTA — per-status next-step button                            */
/* ══════════════════════════════════════════════════════════════════ */
function ActionCta({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'PAID':
      return (
        <CtaButton label="Start delivery" tone="hot" Icon={Truck} />
      );
    case 'IN_PROGRESS':
      return (
        <CtaButton label="Mark delivered" tone="primary" Icon={Package} />
      );
    case 'DELIVERED':
      return (
        <CtaButton label="Awaiting confirm" tone="accent" Icon={Clock} ghost />
      );
    case 'CONFIRMED':
    case 'COMPLETED':
      return (
        <CtaButton label="View receipt" tone="success" Icon={Eye} ghost />
      );
    case 'DISPUTED':
      return (
        <CtaButton label="Open dispute" tone="error" Icon={MessageSquare} />
      );
    case 'REFUNDED':
      return (
        <CtaButton label="View refund" tone="muted" Icon={Eye} ghost />
      );
    case 'CANCELLED':
      return (
        <CtaButton label="View order" tone="muted" Icon={XCircle} ghost />
      );
    case 'PENDING':
    default:
      return (
        <CtaButton label="View order" tone="muted" Icon={Eye} ghost />
      );
  }
}

function CtaButton({
  label,
  Icon,
  tone,
  ghost,
}: {
  label: string;
  Icon: typeof Eye;
  tone: 'hot' | 'primary' | 'success' | 'accent' | 'error' | 'muted';
  ghost?: boolean;
}) {
  const filled: Record<string, string> = {
    hot: 'bg-gradient-to-b from-hot to-hot text-hot-foreground shadow-[0_6px_18px_-4px_hsl(var(--hot)/0.55)]',
    primary: 'bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.55)]',
    success: 'bg-gradient-to-b from-success to-success text-success-foreground',
    error: 'bg-gradient-to-b from-error to-error text-error-foreground',
    accent: 'bg-gradient-to-b from-accent to-accent text-accent-foreground',
    muted: 'bg-muted/40 text-foreground/85',
  };
  const ghostC: Record<string, string> = {
    hot: 'bg-hot/10 ring-hot/25 text-hot',
    primary: 'bg-primary/10 ring-primary/25 text-primary',
    success: 'bg-success/10 ring-success/25 text-success',
    error: 'bg-error/10 ring-error/25 text-error',
    accent: 'bg-accent/10 ring-accent/25 text-accent',
    muted: 'bg-muted/30 ring-border text-muted-foreground',
  };
  return (
    <motion.span
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className={`
        inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] font-bold transition-shadow
        ${ghost ? `ring-1 ${ghostC[tone]}` : filled[tone]}
      `}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
      {!ghost && <ArrowRight className="h-3.5 w-3.5 ml-0.5" />}
    </motion.span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  AUTO-RELEASE COUNTDOWN — for DELIVERED orders                       */
/*  3-day post-delivery escrow window mirrors the platform policy.       */
/*  The detail page has the authoritative `autoReleaseAt` from the API; */
/*  the list view only knows `deliveredAt`, so we estimate +72h.        */
/* ══════════════════════════════════════════════════════════════════ */
const AUTO_RELEASE_WINDOW_MS = 72 * 3_600_000;

function AutoReleaseChip({ deliveredAt }: { deliveredAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000); // tick once a minute
    return () => clearInterval(id);
  }, []);

  const releaseAt = new Date(deliveredAt).getTime() + AUTO_RELEASE_WINDOW_MS;
  const diff = releaseAt - now;
  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/12 text-success font-mono text-[9.5px] uppercase tracking-[0.15em] font-bold">
        <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.5} />
        Auto-release ready
      </span>
    );
  }
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/12 text-accent font-mono text-[9.5px] uppercase tracking-[0.15em] font-bold"
      title="Funds release to your wallet automatically when this countdown ends"
    >
      <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
      Auto-release in {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  EMPTY STATE                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function EmptyState({
  filter,
  hasAny,
  query,
}: {
  filter: Filter;
  hasAny: boolean;
  query: string;
}) {
  if (query.trim()) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
        <div className="grid place-items-center h-14 w-14 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
          <Search className="h-6 w-6" />
        </div>
        <div className="font-display font-bold text-lg mb-1">
          No matches for &ldquo;{query}&rdquo;
        </div>
        <div className="text-[13px] text-muted-foreground">
          Try a buyer name, order number, or listing title.
        </div>
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-accent/8 ring-1 ring-primary/20 p-10 lg:p-14 text-center">
        <motion.div
          aria-hidden
          className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 mb-4">
            <Inbox className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-extrabold mb-2">
            No orders yet
          </h3>
          <p className="text-[14px] text-muted-foreground max-w-md mx-auto mb-6">
            When buyers purchase one of your listings or accept an offer, the order shows up
            here. Get your store stocked first.
          </p>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              href="/listings/new"
              className="
                inline-flex items-center gap-1.5 h-12 px-6 rounded-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[14px] font-bold
                shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
                transition-shadow hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]
              "
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
              Create your first listing
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const labels: Record<Filter, { title: string; body: string }> = {
    all: { title: 'No orders', body: 'Switch filters above.' },
    action: {
      title: 'Inbox zero',
      body: 'No paid orders waiting on you. Buyers love that.',
    },
    progress: {
      title: 'Nothing in progress',
      body: 'Start a paid order from the Needs Action tab.',
    },
    awaiting: {
      title: 'Nothing awaiting confirm',
      body: 'When you mark an order delivered, it shows up here until the buyer confirms.',
    },
    done: {
      title: 'No completed orders yet',
      body: 'Your first wallet credit is one delivery away.',
    },
    issues: {
      title: 'No disputes',
      body: "You're keeping buyers happy.",
    },
  };
  const l = labels[filter];
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-14 w-14 rounded-full bg-success/12 text-success mx-auto mb-3">
        <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} />
      </div>
      <div className="font-display font-bold text-lg mb-1">{l.title}</div>
      <div className="text-[13px] text-muted-foreground">{l.body}</div>
    </div>
  );
}

/* Silence DollarSign — referenced for future, kept for symmetry. */
void DollarSign;
void ChevronRight;
