'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  Clock,
  Flame,
  Inbox,
  Package,
  Search,
  Truck,
} from 'lucide-react';
import { Skeleton, motion } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminOrders } from '@/hooks/use-admin';
import { PaginationButton } from '@/components/ui/pagination-button';
import { timeAgo } from '@/lib/time';

/* GETX Admin — Orders.
   ─────────────────────────────────────────────────────────────────────
   Disputes-first moderation queue. Lands here from the dashboard
   action queue with `?status=DISPUTED` query param. Other statuses
   reachable via filter pills; URL updates so admins can share links.
*/

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'DISPUTED', label: 'Disputed', tone: 'error' },
  { key: 'PAID', label: 'Paid', tone: 'hot' },
  { key: 'IN_PROGRESS', label: 'In progress', tone: 'primary' },
  { key: 'DELIVERED', label: 'Delivered', tone: 'accent' },
  { key: 'COMPLETED', label: 'Completed', tone: 'success' },
  { key: 'REFUNDED', label: 'Refunded', tone: 'warning' },
  { key: 'CANCELLED', label: 'Cancelled', tone: 'muted' },
] as const;

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  buyerTotal: number;
  createdAt: string;
  buyer: { username: string | null; name: string | null };
  seller: { username: string | null; name: string | null };
}

export default function AdminOrdersPage() {
  const sp = useSearchParams();
  const initialStatus = sp.get('status') ?? '';
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [query, setQuery] = useState('');

  /* React to URL changes (e.g., user clicks dashboard pipeline link). */
  useEffect(() => {
    setStatusFilter(sp.get('status') ?? '');
    setPage(1);
  }, [sp]);

  const { data, isLoading } = useAdminOrders({
    page,
    status: statusFilter || undefined,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const rows = data.data as OrderRow[];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((o) => {
      const buyer = (o.buyer.username ?? o.buyer.name ?? '').toLowerCase();
      const seller = (o.seller.username ?? o.seller.name ?? '').toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        buyer.includes(q) ||
        seller.includes(q)
      );
    });
  }, [data, query]);

  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;

  return (
    <AdminShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto space-y-5 lg:space-y-6"
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
              Moderation · orders
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
              Orders
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">
              {statusFilter === 'DISPUTED'
                ? 'Disputed orders need your call — investigate, refund, or force-release.'
                : 'Marketplace order stream — filter, search, drill in.'}
            </p>
          </div>
        </motion.div>

        {/* ── FILTER + SEARCH ────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {STATUSES.map((s) => {
                const active = statusFilter === s.key;
                return (
                  <motion.button
                    key={s.key || 'all'}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s.key);
                      setPage(1);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                      ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                    `}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-orders-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    {s.label}
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
                placeholder="Search order #, buyer, seller"
                className="h-9 w-52 sm:w-72 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={statusFilter} query={query} />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3, ease: EASE }}
              >
                <OrderRowCard order={order} />
              </motion.div>
            ))}
          </div>
        )}

        {/* ── PAGINATION ─────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              Page <span className="text-foreground font-bold tabular-nums">{page}</span> of{' '}
              <span className="text-foreground font-bold tabular-nums">{totalPages}</span> ·{' '}
              {total.toLocaleString('en-US')} total
            </span>
            <div className="flex items-center gap-2">
              <PaginationButton disabled={page <= 1} onClick={() => setPage(page - 1)} dir="prev" />
              <PaginationButton
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                dir="next"
              />
            </div>
          </div>
        )}
      </motion.div>
    </AdminShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  ORDER ROW CARD                                                      */
/* ══════════════════════════════════════════════════════════════════ */
function OrderRowCard({ order }: { order: OrderRow }) {
  const meta = STATUS_META[order.status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;
  const disputed = order.status === 'DISPUTED';
  return (
    <Link
      href={`/orders/${order.id}`}
      className={`
        group relative block rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${disputed ? 'ring-error/30 hover:ring-error/50' : 'ring-border hover:ring-foreground/20'}
        hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.22)]
      `}
    >
      <div aria-hidden className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.stripe}`} />

      <div className="flex items-center gap-3 sm:gap-4 p-4 pl-5">
        <div className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${meta.iconBg}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <StatusPill status={order.status} />
              {disputed && (
                <motion.span
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-error text-error-foreground font-mono text-[9px] uppercase tracking-[0.18em] font-bold"
                >
                  <Flame className="h-2.5 w-2.5" strokeWidth={2.5} />
                  Hot
                </motion.span>
              )}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground truncate">
              {order.orderNumber}
            </div>
          </div>
          <div className="text-[12.5px] min-w-0 hidden lg:block">
            <div className="text-foreground/90 truncate">
              <span className="text-muted-foreground">Buyer</span>{' '}
              <span className="font-semibold">
                {order.buyer.username ?? order.buyer.name ?? '—'}
              </span>
            </div>
            <div className="text-foreground/90 truncate mt-0.5">
              <span className="text-muted-foreground">Seller</span>{' '}
              <span className="font-semibold">
                {order.seller.username ?? order.seller.name ?? '—'}
              </span>
            </div>
          </div>
          <div className="text-right lg:text-left">
            <div className="font-display font-extrabold text-[18px] tabular-nums leading-none">
              ${order.buyerTotal.toFixed(2)}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-1">
              {timeAgo(order.createdAt)} ago
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-end">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary group-hover:gap-2 transition-all">
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATUS META + CHIPS                                                 */
/* ══════════════════════════════════════════════════════════════════ */
const STATUS_META: Record<
  string,
  { label: string; pill: string; stripe: string; iconBg: string; icon: typeof Truck }
> = {
  PENDING: {
    label: 'Pending',
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
    iconBg: 'bg-muted/30 text-muted-foreground',
    icon: Clock,
  },
  PAID: {
    label: 'Paid',
    pill: 'bg-hot/15 text-hot ring-hot/25',
    stripe: 'bg-hot',
    iconBg: 'bg-hot/15 text-hot',
    icon: CircleDollarSign,
  },
  IN_PROGRESS: {
    label: 'In progress',
    pill: 'bg-primary/15 text-primary ring-primary/25',
    stripe: 'bg-primary',
    iconBg: 'bg-primary/15 text-primary',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Delivered',
    pill: 'bg-accent/15 text-accent ring-accent/25',
    stripe: 'bg-accent',
    iconBg: 'bg-accent/15 text-accent',
    icon: Package,
  },
  CONFIRMED: {
    label: 'Confirmed',
    pill: 'bg-success/15 text-success ring-success/25',
    stripe: 'bg-success',
    iconBg: 'bg-success/15 text-success',
    icon: Package,
  },
  COMPLETED: {
    label: 'Completed',
    pill: 'bg-success/15 text-success ring-success/25',
    stripe: 'bg-success',
    iconBg: 'bg-success/15 text-success',
    icon: Package,
  },
  CANCELLED: {
    label: 'Cancelled',
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
    iconBg: 'bg-muted/30 text-muted-foreground',
    icon: Inbox,
  },
  DISPUTED: {
    label: 'Disputed',
    pill: 'bg-error/15 text-error ring-error/25',
    stripe: 'bg-error',
    iconBg: 'bg-error/15 text-error',
    icon: AlertTriangle,
  },
  REFUNDED: {
    label: 'Refunded',
    pill: 'bg-warning/15 text-warning ring-warning/25',
    stripe: 'bg-warning',
    iconBg: 'bg-warning/15 text-warning',
    icon: AlertTriangle,
  },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${meta.pill} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      {meta.label}
    </span>
  );
}

function EmptyState({ filter, query }: { filter: string; query: string }) {
  if (query.trim()) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
        <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
          <Search className="h-5 w-5" />
        </div>
        <div className="font-display font-bold text-[15px] mb-1">
          No matches for &ldquo;{query}&rdquo;
        </div>
        <div className="text-[13px] text-muted-foreground">Try a different keyword.</div>
      </div>
    );
  }
  if (filter === 'DISPUTED') {
    return (
      <div className="rounded-3xl bg-success/5 ring-1 ring-success/20 p-12 text-center">
        <div className="grid place-items-center h-12 w-12 rounded-full bg-success/15 text-success mx-auto mb-3">
          <Inbox className="h-5 w-5" />
        </div>
        <div className="font-display font-bold text-[16px] mb-1">No open disputes</div>
        <div className="text-[13px] text-muted-foreground">Marketplace is calm.</div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="text-[13px] text-muted-foreground">No orders match this filter.</div>
    </div>
  );
}
