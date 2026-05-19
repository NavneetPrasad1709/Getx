'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Boxes,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Flame,
  Inbox,
  Layers,
  Search,
  Sparkles,
  Target,
  Users,
  Wallet as WalletIcon,
  Zap,
} from 'lucide-react';
import { Skeleton, motion, AnimatePresence } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useOpenRequests, type OpenRequestItem } from '@/hooks/use-seller-requests';
import { useMyOffers } from '@/hooks/use-seller-offers';
import { useAuth } from '@/hooks/use-auth';

/* GETX Seller — Open Requests (bid board).
   ─────────────────────────────────────────────────────────────────────
   Reverse-marketplace: buyers post needs, sellers compete to fulfil.
   Inspired by eldorado.gg's request board and zeusx's "you bid" markers,
   pushed further with:

     • Time-left countdown chips (red <24h, amber <3d, neutral else)
     • "You bid $X" highlight when seller already submitted an offer
     • Smart sort: newest, ending soon, highest budget, fewest offers
     • Filter pills by category
     • Stat strip: open count, closing today, avg budget, your bids
*/

const EASE = [0.22, 1, 0.36, 1] as const;

type TabFilter = 'all' | 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';
type SortKey = 'newest' | 'ending' | 'budget-high' | 'fewest-offers';

const TAB_FILTERS: { key: TabFilter; label: string; icon: typeof Layers }[] = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'ACCOUNTS', label: 'Accounts', icon: Layers },
  { key: 'TOP_UPS', label: 'Top-Ups', icon: WalletIcon },
  { key: 'ITEMS', label: 'Items', icon: Boxes },
  { key: 'BOOSTING', label: 'Boosting', icon: Zap },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'ending', label: 'Ending soon' },
  { key: 'budget-high', label: 'Budget: high → low' },
  { key: 'fewest-offers', label: 'Fewest offers' },
];

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function timeLeft(iso: string): { label: string; tone: 'hot' | 'warning' | 'muted' } {
  const h = hoursUntil(iso);
  if (h <= 0) return { label: 'Expired', tone: 'muted' };
  if (h < 24) {
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return { label: hh > 0 ? `${hh}h ${mm}m left` : `${mm}m left`, tone: 'hot' };
  }
  const days = Math.floor(h / 24);
  if (days < 3) return { label: `${days}d left`, tone: 'warning' };
  return { label: `${days}d left`, tone: 'muted' };
}

function prettyCategory(s: string | null): string | null {
  if (!s) return null;
  return s
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function OpenRequestsPage() {
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;
  const { data, isLoading } = useOpenRequests({ gameSlug: 'pokemon-go' });
  const { data: myOffers } = useMyOffers();
  const [tab, setTab] = useState<TabFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState('');

  /* Lookup: request id → my offer (price + status) so the cards can
     flag "you already bid" without an extra request per row. */
  const myBidByRequest = useMemo(() => {
    const map = new Map<string, { price: number; status: string }>();
    for (const o of myOffers ?? []) {
      if (o.status === 'PENDING' || o.status === 'ACCEPTED') {
        map.set(o.request.id, { price: o.price, status: o.status });
      }
    }
    return map;
  }, [myOffers]);

  const all = useMemo(() => data?.data ?? [], [data]);

  /* Top stats. */
  const summary = useMemo(() => {
    const counts: Record<TabFilter, number> = {
      all: all.length,
      ACCOUNTS: 0,
      TOP_UPS: 0,
      ITEMS: 0,
      BOOSTING: 0,
    };
    let closingToday = 0;
    let budgetSum = 0;
    let budgetCount = 0;
    for (const r of all) {
      counts[r.tabType] = (counts[r.tabType] ?? 0) + 1;
      if (hoursUntil(r.expiresAt) < 24 && hoursUntil(r.expiresAt) > 0) closingToday += 1;
      const mid = (r.budgetMin + r.budgetMax) / 2;
      budgetSum += mid;
      budgetCount += 1;
    }
    const avgBudget = budgetCount > 0 ? budgetSum / budgetCount : 0;
    return { counts, closingToday, avgBudget };
  }, [all]);

  /* Filter + search + sort. */
  const filtered = useMemo(() => {
    let list = tab === 'all' ? all : all.filter((r) => r.tabType === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.requestNumber.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
        case 'ending':
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        case 'budget-high':
          return b.budgetMax - a.budgetMax;
        case 'fewest-offers':
          return a.offerCount - b.offerCount;
      }
    });
    return sorted;
  }, [all, tab, query, sort]);

  if (!isSeller) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-3xl mx-auto">
          <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
            <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/10 text-primary mx-auto mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Activate seller mode first</h2>
            <p className="text-muted-foreground mb-6">
              Open requests are the fastest way to land your first orders.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground text-[13.5px] font-bold shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]"
            >
              Go to dashboard
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SellerShell>
    );
  }

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-6 lg:space-y-8"
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
                Reverse market
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                Open requests
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                Buyers are looking. Bid fast, deliver fast, get paid.
              </p>
            </div>
            <Link
              href="/offers"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-muted/25 hover:bg-muted/40 ring-1 ring-border text-[12.5px] font-semibold transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5" />
              My offers
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>

        {/* ── STAT STRIP ─────────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatTile icon={Inbox} label="Open now" value={summary.counts.all} tone="primary" hint="Live in marketplace" />
          <StatTile icon={Flame} label="Closing today" value={summary.closingToday} tone="hot" hint="Less than 24h left" />
          <StatTile
            icon={DollarSign}
            label="Avg budget"
            value={`$${summary.avgBudget.toFixed(0)}`}
            tone="accent"
            hint="Across all categories"
          />
          <StatTile icon={Target} label="Your active bids" value={myBidByRequest.size} tone="success" hint="Pending + accepted" />
        </motion.div>

        {/* ── FILTER + SEARCH + SORT BAR ─────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {TAB_FILTERS.map((f) => {
                const Icon = f.icon;
                const active = tab === f.key;
                const count = summary.counts[f.key] ?? 0;
                return (
                  <motion.button
                    key={f.key}
                    type="button"
                    onClick={() => setTab(f.key)}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                      ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                    `}
                  >
                    {active && (
                      <motion.span
                        layoutId="req-tab-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {f.label}
                    <span className="inline-flex items-center justify-center h-4 min-w-5 px-1 rounded-full text-[10px] font-mono font-bold tabular-nums bg-muted/40 text-foreground/80">
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
                placeholder="Search requests"
                className="h-9 w-48 sm:w-56 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-muted/25 ring-1 ring-transparent hover:bg-muted/40 text-[12.5px] font-semibold transition-colors"
              >
                <span className="hidden sm:inline">{SORTS.find((s) => s.key === sort)?.label}</span>
                <span className="sm:hidden">Sort</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSortOpen(false)}
                      aria-label="Close sort menu"
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: EASE }}
                      className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl bg-surface ring-1 ring-border shadow-[0_24px_48px_-20px_hsl(0_0%_0%/0.25)] py-1.5 overflow-hidden"
                    >
                      {SORTS.map((s) => (
                        <li key={s.key}>
                          <button
                            type="button"
                            onClick={() => {
                              setSort(s.key);
                              setSortOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-[12.5px] flex items-center gap-2 transition-colors ${
                              sort === s.key
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-foreground/85 hover:bg-muted/30'
                            }`}
                          >
                            {sort === s.key && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />}
                            <span className={sort === s.key ? '' : 'ml-[22px]'}>{s.label}</span>
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={all.length > 0} query={query} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {filtered.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: EASE }}
                layout
              >
                <RequestCard request={r} myBid={myBidByRequest.get(r.id)} />
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
/*  REQUEST CARD                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function RequestCard({
  request,
  myBid,
}: {
  request: OpenRequestItem;
  myBid?: { price: number; status: string };
}) {
  const tl = timeLeft(request.expiresAt);
  const sub = prettyCategory(request.subCategory);
  const buyerInitial = (request.buyer.username ?? request.buyer.name ?? '?').slice(0, 1).toUpperCase();
  const competition =
    request.offerCount === 0
      ? { label: 'No bids yet', tone: 'text-success' }
      : request.offerCount < 3
        ? { label: `${request.offerCount} bid${request.offerCount === 1 ? '' : 's'}`, tone: 'text-foreground/70' }
        : { label: `${request.offerCount} bids`, tone: 'text-warning' };

  return (
    <Link
      href={`/requests/${request.id}`}
      className={`
        group relative block rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${myBid ? 'ring-primary/40 hover:ring-primary/60' : 'ring-border hover:ring-foreground/20'}
        hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.22)]
      `}
    >
      {/* Top accent stripe — gold if matches my bid */}
      <div
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${myBid ? 'bg-primary' : 'bg-muted/40'}`}
      />

      <div className="p-4 lg:p-5 pl-5 lg:pl-6">
        {/* Top row: chips + time-left */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryChip type={request.tabType} />
            {sub && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/30 ring-1 ring-border font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/80 font-bold">
                {sub}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {request.requestNumber}
            </span>
          </div>
          <TimeLeftChip tone={tl.tone} label={tl.label} />
        </div>

        {/* Title + body */}
        <h3 className="font-display font-bold text-[16px] leading-snug mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
          {request.title}
        </h3>
        <p className="text-[12.5px] text-muted-foreground leading-snug line-clamp-2 min-h-[2.4em] mb-3">
          {request.description}
        </p>

        {/* Bottom row */}
        <div className="flex items-end justify-between gap-3 mt-1">
          <div className="flex items-center gap-3 flex-wrap text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <div className="grid place-items-center h-5 w-5 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[9px]">
                {buyerInitial}
              </div>
              {request.buyer.country || '—'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" strokeWidth={2.5} />
              {request.deliveryDays}d delivery
            </span>
            <span className={`inline-flex items-center gap-1 font-mono ${competition.tone}`}>
              <Users className="h-3 w-3" strokeWidth={2.5} />
              {competition.label}
            </span>
          </div>
          <div className="text-right">
            <div className="font-display font-extrabold text-[18px] tabular-nums leading-none">
              ${request.budgetMin}
              {request.budgetMax !== request.budgetMin && (
                <>
                  <span className="text-muted-foreground/60">–</span>${request.budgetMax}
                </>
              )}
            </div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
              Budget
            </div>
          </div>
        </div>

        {/* "You bid" or "Place bid" footer */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
          {myBid ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.18em] font-bold ${
                myBid.status === 'ACCEPTED' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
              You bid ${myBid.price.toFixed(0)}
              {myBid.status === 'ACCEPTED' && ' · accepted'}
            </span>
          ) : (
            <span className="text-[11.5px] text-muted-foreground">
              Tap to place your bid
            </span>
          )}
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  CHIPS                                                               */
/* ══════════════════════════════════════════════════════════════════ */
function CategoryChip({ type }: { type: OpenRequestItem['tabType'] }) {
  const meta: Record<OpenRequestItem['tabType'], { label: string; icon: typeof Layers; tone: string }> = {
    ACCOUNTS: { label: 'Accounts', icon: Layers, tone: 'bg-primary/12 text-primary' },
    TOP_UPS: { label: 'Top-Ups', icon: WalletIcon, tone: 'bg-accent/12 text-accent' },
    ITEMS: { label: 'Items', icon: Boxes, tone: 'bg-success/12 text-success' },
    BOOSTING: { label: 'Boosting', icon: Zap, tone: 'bg-hot/12 text-hot' },
  };
  const m = meta[type];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${m.tone} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {m.label}
    </span>
  );
}

function TimeLeftChip({ tone, label }: { tone: 'hot' | 'warning' | 'muted'; label: string }) {
  const tones: Record<string, string> = {
    hot: 'bg-hot/12 text-hot ring-hot/25',
    warning: 'bg-warning/12 text-warning ring-warning/25',
    muted: 'bg-muted/30 text-muted-foreground ring-border',
  };
  if (tone === 'hot') {
    return (
      <motion.span
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${tones[tone]} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold shrink-0`}
      >
        <Flame className="h-3 w-3" strokeWidth={2.5} />
        {label}
      </motion.span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${tones[tone]} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold shrink-0`}
    >
      <Clock className="h-3 w-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  EMPTY STATE                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function EmptyState({ hasAny, query }: { hasAny: boolean; query: string }) {
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
          Try a broader search or clear the query.
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
            Quiet right now
          </h3>
          <p className="text-[14px] text-muted-foreground max-w-md mx-auto">
            No open buyer requests at the moment. We&apos;ll surface new ones the second they go live.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="text-[13px] text-muted-foreground">
        No requests in this category. Try another filter.
      </div>
    </div>
  );
}
