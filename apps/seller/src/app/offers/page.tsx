'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  MessageSquare,
  Search,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { Skeleton, motion, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useMyOffers, useWithdrawOffer, type OfferStatus, type SellerOffer } from '@/hooks/use-seller-offers';

/* GETX Seller — My Offers.
   ─────────────────────────────────────────────────────────────────────
   Tracks every bid the seller has placed on buyer requests. Inspired by
   eldorado.gg's offer pipeline + zeusx's status-aware action cards,
   pushed further with:

     • Hit-rate KPI (accepted / total) — gamifies offer quality
     • Status filter pills with live counts
     • Status-aware CTAs:
         PENDING → Open request + Withdraw
         ACCEPTED → Open chat with buyer (won!)
         REJECTED → Browse similar
         WITHDRAWN → View request
*/

const EASE = [0.22, 1, 0.36, 1] as const;

type Filter = 'all' | OfferStatus;

const FILTERS: { key: Filter; label: string; tone: string }[] = [
  { key: 'all', label: 'All', tone: 'bg-muted/40 text-foreground' },
  { key: 'PENDING', label: 'Pending', tone: 'bg-accent/15 text-accent' },
  { key: 'ACCEPTED', label: 'Accepted', tone: 'bg-success/15 text-success' },
  { key: 'REJECTED', label: 'Rejected', tone: 'bg-error/15 text-error' },
  { key: 'WITHDRAWN', label: 'Withdrawn', tone: 'bg-muted/40 text-muted-foreground' },
];

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

function hoursUntilExpiry(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

export default function MyOffersPage() {
  const { data: offers, isLoading } = useMyOffers();
  const withdraw = useWithdrawOffer();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const all = useMemo(() => offers ?? [], [offers]);

  const summary = useMemo(() => {
    const counts: Record<Filter, number> = {
      all: all.length,
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };
    let totalPending = 0;
    let earnings = 0;
    for (const o of all) {
      counts[o.status] += 1;
      if (o.status === 'PENDING') totalPending += o.price;
      if (o.status === 'ACCEPTED') earnings += o.price;
    }
    const hitRate =
      counts.ACCEPTED + counts.REJECTED > 0
        ? (counts.ACCEPTED / (counts.ACCEPTED + counts.REJECTED)) * 100
        : 0;
    return { counts, totalPending, earnings, hitRate };
  }, [all]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? all : all.filter((o) => o.status === filter);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => {
      const title = o.request.title.toLowerCase();
      const num = o.request.requestNumber.toLowerCase();
      return title.includes(q) || num.includes(q) || o.message.toLowerCase().includes(q);
    });
  }, [all, filter, query]);

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this offer? Buyers won\'t see it anymore.')) return;
    try {
      await withdraw.mutateAsync(id);
      toast.success('Offer withdrawn');
    } catch {
      toast.error('Could not withdraw');
    }
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
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
                Reverse market
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                My offers
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                Every bid you&apos;ve placed, plus how they&apos;re doing.
              </p>
            </div>
            <Link
              href="/requests"
              className="
                inline-flex items-center gap-1.5 h-11 px-5 rounded-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[13px] font-bold
                shadow-[0_8px_22px_-4px_hsl(var(--primary)/0.55)]
                hover:-translate-y-px transition-all
              "
            >
              <Briefcase className="h-4 w-4" strokeWidth={2.5} />
              Browse requests
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* ── STAT STRIP ─────────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatTile icon={Inbox} label="Total offers" value={summary.counts.all} tone="primary" hint="Every bid you've placed" />
          <StatTile
            icon={Clock}
            label="Pending"
            value={summary.counts.PENDING}
            tone="accent"
            hint={`$${summary.totalPending.toFixed(0)} on the table`}
          />
          <StatTile
            icon={Trophy}
            label="Hit rate"
            value={`${summary.hitRate.toFixed(0)}%`}
            tone="success"
            hint={`${summary.counts.ACCEPTED} wins · ${summary.counts.REJECTED} losses`}
          />
          <StatTile
            icon={Target}
            label="Earnings won"
            value={`$${summary.earnings.toFixed(0)}`}
            tone="accent"
            hint="From accepted offers"
          />
        </motion.div>

        {/* ── FILTER + SEARCH ────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                const count = summary.counts[f.key];
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
                        layoutId="offer-filter-pill"
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
                placeholder="Search title or request #"
                className="h-9 w-48 sm:w-64 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} hasAny={all.length > 0} query={query} />
        ) : (
          <div className="space-y-3">
            {filtered.map((o, idx) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: EASE }}
                layout
              >
                <OfferCard offer={o} onWithdraw={() => handleWithdraw(o.id)} />
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
  icon: typeof Inbox;
  label: string;
  value: string | number;
  hint: string;
  tone: 'primary' | 'accent' | 'success';
}) {
  const tones = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
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
/*  OFFER CARD                                                          */
/* ══════════════════════════════════════════════════════════════════ */
const STATUS_META: Record<
  OfferStatus,
  { label: string; pill: string; stripe: string }
> = {
  PENDING: {
    label: 'Pending',
    pill: 'bg-accent/15 text-accent ring-accent/25',
    stripe: 'bg-accent',
  },
  ACCEPTED: {
    label: 'Accepted',
    pill: 'bg-success/15 text-success ring-success/25',
    stripe: 'bg-success',
  },
  REJECTED: {
    label: 'Rejected',
    pill: 'bg-error/15 text-error ring-error/25',
    stripe: 'bg-error',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
  },
};

function OfferCard({
  offer,
  onWithdraw,
}: {
  offer: SellerOffer;
  onWithdraw: () => void;
}) {
  const meta = STATUS_META[offer.status];
  const hoursLeft = hoursUntilExpiry(offer.expiresAt);
  const expiresSoon = offer.status === 'PENDING' && hoursLeft > 0 && hoursLeft < 24;

  return (
    <div
      className={`
        relative group rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${offer.status === 'ACCEPTED' ? 'ring-success/30 hover:ring-success/50' : 'ring-border hover:ring-foreground/20'}
        hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.22)]
      `}
    >
      <div aria-hidden className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.stripe}`} />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Status + meta row */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusPill status={offer.status} />
              {expiresSoon && (
                <motion.span
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-hot/15 text-hot ring-1 ring-hot/25 font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold"
                >
                  <Clock className="h-3 w-3" strokeWidth={2.5} />
                  Expires in {Math.floor(hoursLeft)}h
                </motion.span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {offer.request.requestNumber}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                · placed {timeAgo(offer.createdAt)}
              </span>
            </div>

            {/* Title */}
            <Link
              href={`/requests/${offer.request.id}`}
              className="font-display font-bold text-[15.5px] leading-snug hover:text-primary transition-colors line-clamp-1 mb-1.5 inline-block"
            >
              {offer.request.title}
            </Link>

            {/* Message preview */}
            <p className="text-[12.5px] text-muted-foreground leading-snug line-clamp-2 mb-3">
              <span className="text-foreground/60 font-mono text-[10px] uppercase tracking-wider mr-1.5">
                Your msg:
              </span>
              {offer.message}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" strokeWidth={2.5} />
                {offer.deliveryHours}h delivery
              </span>
              <span>·</span>
              <span>{offer.request.game.name}</span>
              {offer.request.subCategory && (
                <>
                  <span>·</span>
                  <span>
                    {offer.request.subCategory
                      .split('-')
                      .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
                      .join(' ')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right column — price + CTA */}
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <div className="font-display font-extrabold text-[22px] tabular-nums leading-none">
                ${offer.price.toFixed(2)}
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-1">
                Your bid
              </div>
            </div>
            <ActionCta offer={offer} onWithdraw={onWithdraw} />
          </div>
        </div>

        {/* Mobile price + actions */}
        <div className="sm:hidden mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div>
            <div className="font-display font-extrabold text-[20px] tabular-nums leading-none">
              ${offer.price.toFixed(2)}
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mt-0.5">
              Your bid
            </div>
          </div>
          <ActionCta offer={offer} onWithdraw={onWithdraw} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: OfferStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${m.pill} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      {status === 'ACCEPTED' && <Trophy className="h-3 w-3" strokeWidth={2.5} />}
      {status === 'PENDING' && <span className="h-1 w-1 rounded-full bg-current animate-pulse" />}
      {status === 'REJECTED' && <XCircle className="h-3 w-3" strokeWidth={2.5} />}
      {status === 'WITHDRAWN' && <X className="h-3 w-3" strokeWidth={2.5} />}
      {m.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATUS-AWARE CTA                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function ActionCta({ offer, onWithdraw }: { offer: SellerOffer; onWithdraw: () => void }) {
  switch (offer.status) {
    case 'ACCEPTED':
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/requests/${offer.request.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-gradient-to-b from-success to-success text-success-foreground text-[12.5px] font-bold shadow-[0_6px_18px_-4px_hsl(var(--success)/0.5)] hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.5} />
            Open chat
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      );
    case 'PENDING':
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onWithdraw}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-muted/30 ring-1 ring-border text-muted-foreground text-[12px] font-semibold hover:bg-error/15 hover:text-error hover:ring-error/25 transition-colors"
            title="Withdraw your offer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Withdraw
          </button>
          <Link
            href={`/requests/${offer.request.id}`}
            className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-primary/10 ring-1 ring-primary/25 text-primary text-[12px] font-bold hover:bg-primary/20 transition-colors"
          >
            View
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      );
    case 'REJECTED':
      return (
        <Link
          href="/requests"
          className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-muted/30 ring-1 ring-border text-foreground/85 text-[12px] font-semibold hover:bg-muted/50 transition-colors"
        >
          Browse similar
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      );
    case 'WITHDRAWN':
    default:
      return (
        <Link
          href={`/requests/${offer.request.id}`}
          className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-muted/30 ring-1 ring-border text-muted-foreground text-[12px] font-semibold hover:bg-muted/50 transition-colors"
        >
          View request
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      );
  }
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
        <div className="font-display font-bold text-lg mb-1">No matches for &ldquo;{query}&rdquo;</div>
        <div className="text-[13px] text-muted-foreground">Try a different keyword.</div>
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
            <Sparkles className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-extrabold mb-2">
            Place your first bid
          </h3>
          <p className="text-[14px] text-muted-foreground max-w-md mx-auto mb-6">
            Buyers post what they need. Sellers with fast replies and competitive prices win.
          </p>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              href="/requests"
              className="
                inline-flex items-center gap-1.5 h-12 px-6 rounded-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[14px] font-bold
                shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
                transition-shadow hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]
              "
            >
              <Briefcase className="h-4 w-4" strokeWidth={2.5} />
              Browse open requests
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }
  const labels: Record<Filter, string> = {
    all: 'offers',
    PENDING: 'pending offers',
    ACCEPTED: 'accepted offers',
    REJECTED: 'rejected offers',
    WITHDRAWN: 'withdrawn offers',
  };
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-12 w-12 rounded-full bg-success/12 text-success mx-auto mb-3">
        <CheckCircle2 className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="font-display font-bold text-[15px] mb-0.5">No {labels[filter]}</div>
      <div className="text-[12.5px] text-muted-foreground">Try a different filter.</div>
    </div>
  );
}
