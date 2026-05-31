'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  DollarSign,
  Eye,
  Filter,
  Grid3X3,
  ImageOff,
  LayoutList,
  MoreVertical,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Badge, Skeleton, toast, motion, AnimatePresence } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import {
  useDeleteListing,
  useMyListings,
  useUpdateListing,
  type ListingStatus,
  type SellerListing,
} from '@/hooks/use-seller-listings';
import { useAuth } from '@/hooks/use-auth';

/* GETX Seller — Listings.
   ─────────────────────────────────────────────────────────────────────
   Built around the seller's actual workflow:

     1. Glance at how the store is doing       → top stat strip
     2. Find a specific listing               → search + sort + filter
     3. Manage many at once                   → bulk select + bulk pause/delete
     4. Manage one quickly                    → per-card quick actions

   Visual language follows the dashboard: soft gradients, generous
   whitespace, framer-motion entrance + hover micro-interactions. */

type Filter = 'all' | ListingStatus;
type SortKey = 'newest' | 'oldest' | 'best-selling' | 'most-viewed' | 'price-low' | 'price-high';
type ViewMode = 'grid' | 'list';

const EASE = [0.22, 1, 0.36, 1] as const;

const FILTERS: { key: Filter; label: string; tone: string }[] = [
  { key: 'all', label: 'All', tone: 'bg-muted/40 text-foreground' },
  { key: 'ACTIVE', label: 'Live', tone: 'bg-success/15 text-success' },
  { key: 'DRAFT', label: 'Drafts', tone: 'bg-accent/15 text-accent' },
  { key: 'PAUSED', label: 'Paused', tone: 'bg-warning/15 text-warning' },
  { key: 'SOLD_OUT', label: 'Sold out', tone: 'bg-muted/40 text-muted-foreground' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'best-selling', label: 'Best selling' },
  { key: 'most-viewed', label: 'Most viewed' },
  { key: 'price-high', label: 'Price: high → low' },
  { key: 'price-low', label: 'Price: low → high' },
];

export default function ListingsPage() {
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;
  const { data: listings, isLoading } = useMyListings();
  const deleteListing = useDeleteListing();
  const updateListing = useUpdateListing();

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const all = useMemo(() => listings ?? [], [listings]);

  /* Top-level numbers — derived once, consumed by stat strip + filter pills. */
  const summary = useMemo(() => {
    const active = all.filter((l) => l.status === 'ACTIVE');
    const draft = all.filter((l) => l.status === 'DRAFT');
    const paused = all.filter((l) => l.status === 'PAUSED');
    const soldOut = all.filter((l) => l.status === 'SOLD_OUT');
    const totalViews = all.reduce((s, l) => s + (l.viewCount ?? 0), 0);
    const totalSold = all.reduce((s, l) => s + (l.soldCount ?? 0), 0);
    const revenue = all.reduce((s, l) => s + (l.soldCount ?? 0) * (l.price ?? 0), 0);
    return {
      counts: {
        all: all.length,
        ACTIVE: active.length,
        DRAFT: draft.length,
        PAUSED: paused.length,
        SOLD_OUT: soldOut.length,
        REMOVED: all.filter((l) => l.status === 'REMOVED').length,
      } as Record<Filter, number>,
      totalViews,
      totalSold,
      revenue,
    };
  }, [all]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? all : all.filter((l) => l.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (l) => l.title.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'best-selling':
          return (b.soldCount ?? 0) - (a.soldCount ?? 0);
        case 'most-viewed':
          return (b.viewCount ?? 0) - (a.viewCount ?? 0);
        case 'price-high':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'price-low':
          return (a.price ?? 0) - (b.price ?? 0);
      }
    });
    return sorted;
  }, [all, filter, query, sort]);

  const allSelectedInView =
    filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelectedInView) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    try {
      await deleteListing.mutateAsync(id);
      setSelectedIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      toast.success('Listing deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleTogglePause = async (listing: SellerListing) => {
    const next = listing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await updateListing.mutateAsync({
        id: listing.id,
        payload: { publish: next === 'ACTIVE' },
      });
      toast.success(next === 'PAUSED' ? 'Listing paused' : 'Listing live');
    } catch {
      toast.error('Could not update status');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} listing${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`)) return;
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await deleteListing.mutateAsync(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setSelectedIds(new Set());
    if (ok > 0) toast.success(`Deleted ${ok} listing${ok === 1 ? '' : 's'}`);
    if (fail > 0) toast.error(`${fail} could not be deleted`);
  };

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
                Your store
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                Listings
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                Manage every drop your buyers see.
              </p>
            </div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/listings/new"
                aria-disabled={!isSeller}
                className={`
                  inline-flex items-center gap-1.5 h-11 px-5 rounded-full
                  bg-gradient-to-b from-primary to-primary-hover
                  text-primary-foreground text-[13.5px] font-bold
                  shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
                  transition-shadow hover:shadow-[0_14px_36px_-6px_hsl(var(--primary)/0.65)]
                  ${!isSeller ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Create listing
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* ── STAT STRIP ─────────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatTile icon={Tag} label="Total listings" value={summary.counts.all} tone="primary" />
          <StatTile icon={Eye} label="Total views" value={summary.totalViews.toLocaleString()} tone="accent" />
          <StatTile icon={Package} label="Lifetime sold" value={summary.totalSold} tone="success" />
          <StatTile icon={DollarSign} label="Lifetime revenue" value={`$${summary.revenue.toFixed(0)}`} tone="primary" />
        </motion.div>

        {/* ── FILTER + SEARCH + SORT + VIEW TOGGLE ───────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {FILTERS.map((f) => {
                const count = f.key === 'all' ? summary.counts.all : summary.counts[f.key];
                const active = filter === f.key;
                return (
                  <motion.button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative inline-flex items-center gap-2 h-11 sm:h-10 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                      ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                    `}
                  >
                    {active && (
                      <motion.span
                        layoutId="filter-pill"
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or SKU"
                className="h-11 sm:h-10 w-44 sm:w-56 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 h-11 sm:h-10 px-3 rounded-full bg-muted/25 ring-1 ring-transparent hover:bg-muted/40 text-[12.5px] font-semibold transition-colors"
              >
                <Filter className="h-3.5 w-3.5" />
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

            {/* View toggle */}
            <div className="hidden sm:inline-flex items-center rounded-full bg-muted/25 p-0.5 ring-1 ring-transparent">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className={`grid place-items-center h-8 w-8 rounded-full transition-colors ${
                  view === 'grid' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
                className={`grid place-items-center h-8 w-8 rounded-full transition-colors ${
                  view === 'list' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── BULK ACTION BAR ────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-3 rounded-2xl bg-primary/10 ring-1 ring-primary/25 px-4 py-3"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold text-primary">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-error/15 ring-1 ring-error/25 text-error text-[12.5px] font-bold hover:bg-error/25 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BODY ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={view === 'grid' ? 'h-72 rounded-2xl' : 'h-24 rounded-2xl'} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} hasAny={all.length > 0} query={query} />
        ) : (
          <>
            {/* Select-all row (only in list view, where checkboxes are visible) */}
            {view === 'list' && filtered.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className={`grid place-items-center h-4 w-4 rounded border-2 transition-all ${allSelectedInView ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                  {allSelectedInView && <CheckCircle2 className="h-3 w-3" strokeWidth={3} />}
                </span>
                {allSelectedInView ? 'Deselect all' : 'Select all'}
              </button>
            )}

            <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {filtered.map((listing, idx) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.4, ease: EASE }}
                  layout
                >
                  {view === 'grid' ? (
                    <ListingCardGrid
                      listing={listing}
                      selected={selectedIds.has(listing.id)}
                      onToggleSelect={() => toggleOne(listing.id)}
                      onDelete={() => handleDelete(listing.id, listing.title)}
                      onTogglePause={() => handleTogglePause(listing)}
                    />
                  ) : (
                    <ListingCardList
                      listing={listing}
                      selected={selectedIds.has(listing.id)}
                      onToggleSelect={() => toggleOne(listing.id)}
                      onDelete={() => handleDelete(listing.id, listing.title)}
                      onTogglePause={() => handleTogglePause(listing)}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </>
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
  tone,
}: {
  icon: typeof Tag;
  label: string;
  value: string | number;
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
      className="rounded-2xl bg-surface ring-1 ring-border p-4 lg:p-5 hover:ring-foreground/15 transition-shadow hover:shadow-[0_14px_36px_-22px_hsl(var(--foreground)/0.2)] min-w-0"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`grid place-items-center h-9 w-9 rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
      <div className="font-display font-extrabold text-[clamp(1.125rem,4vw,1.75rem)] lg:text-[28px] tabular-nums leading-none mb-1 truncate">
        {value}
      </div>
      <div className="text-[12px] text-muted-foreground truncate">{label}</div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  GRID CARD — bigger thumbnail, hover lift, action menu              */
/* ══════════════════════════════════════════════════════════════════ */
function ListingCardGrid({
  listing,
  selected,
  onToggleSelect,
  onDelete,
  onTogglePause,
}: {
  listing: SellerListing;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const conversionRate =
    listing.viewCount > 0 ? ((listing.soldCount / listing.viewCount) * 100).toFixed(1) : '0.0';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`relative group rounded-2xl bg-surface ring-1 overflow-hidden transition-all ${
        selected ? 'ring-primary ring-2' : 'ring-border hover:ring-foreground/20'
      } hover:shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.22)]`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] bg-muted/40 overflow-hidden">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0]}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageOff className="h-8 w-8 opacity-50" />
          </div>
        )}
        {/* Gradient overlay so badges pop */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />

        {/* Status pill */}
        <div className="absolute top-3 left-3">
          <StatusPill status={listing.status} />
        </div>

        {/* Select checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleSelect();
          }}
          aria-label={selected ? 'Deselect' : 'Select'}
          className={`
            absolute top-3 right-3 grid place-items-center h-6 w-6 rounded-md transition-all
            ${selected ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-black/40 backdrop-blur-sm ring-1 ring-white/25 text-transparent group-hover:text-white/60'}
          `}
        >
          {selected ? <CheckCircle2 className="h-4 w-4" strokeWidth={3} /> : <span className="block h-2 w-2 rounded-sm" />}
        </button>

        {/* SKU on bottom */}
        <div className="absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 font-bold drop-shadow-[0_2px_8px_rgb(0_0_0_/_0.6)]">
          {listing.sku}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-display font-bold text-[15px] leading-snug line-clamp-2 min-h-[2.4em] mb-2">
          {listing.title}
        </h3>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-display font-extrabold text-xl tabular-nums">
            ${listing.price.toFixed(2)}
          </span>
          <span className="text-[11px] text-muted-foreground">{listing.game.name}</span>
        </div>

        {/* Mini metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <MiniMetric icon={Eye} value={listing.viewCount} label="views" />
          <MiniMetric icon={Package} value={listing.soldCount} label="sold" />
          <MiniMetric icon={TrendingUp} value={`${conversionRate}%`} label="conv" />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 rounded-full bg-muted/25 ring-1 ring-border text-[12px] font-semibold text-muted-foreground cursor-not-allowed"
            title="Edit coming soon"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          {(listing.status === 'ACTIVE' || listing.status === 'PAUSED') && (
            <button
              type="button"
              onClick={onTogglePause}
              className={`inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 rounded-full ring-1 text-[12px] font-semibold transition-colors ${
                listing.status === 'ACTIVE'
                  ? 'bg-warning/10 ring-warning/25 text-warning hover:bg-warning/20'
                  : 'bg-success/10 ring-success/25 text-success hover:bg-success/20'
              }`}
              title={listing.status === 'ACTIVE' ? 'Pause listing' : 'Resume listing'}
            >
              {listing.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More actions"
              className="grid place-items-center h-9 w-9 rounded-full bg-muted/25 ring-1 ring-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    className="absolute right-0 bottom-full mb-2 z-20 w-44 rounded-xl bg-surface ring-1 ring-border shadow-[0_24px_48px_-20px_hsl(0_0%_0%/0.25)] py-1 overflow-hidden"
                  >
                    <MenuItem icon={ArrowUpRight} label="View public page" disabled />
                    <MenuItem icon={Copy} label="Duplicate" disabled />
                    <div className="border-t border-border my-1" />
                    <MenuItem
                      icon={Trash2}
                      label="Delete"
                      tone="error"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  LIST CARD — compact horizontal row                                  */
/* ══════════════════════════════════════════════════════════════════ */
function ListingCardList({
  listing,
  selected,
  onToggleSelect,
  onDelete,
  onTogglePause,
}: {
  listing: SellerListing;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 sm:gap-4 rounded-2xl bg-surface ring-1 p-3 sm:p-4 transition-all ${
        selected ? 'ring-primary ring-2' : 'ring-border hover:ring-foreground/15'
      }`}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        aria-label={selected ? 'Deselect' : 'Select'}
        className={`grid place-items-center h-5 w-5 rounded-md border-2 shrink-0 transition-all ${
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-muted-foreground/60'
        }`}
      >
        {selected && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-muted/40 overflow-hidden shrink-0">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0]}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageOff className="h-5 w-5 opacity-50" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <StatusPill status={listing.status} />
          <span className="font-mono text-[10px] text-muted-foreground">{listing.sku}</span>
        </div>
        <h3 className="font-semibold text-[14px] truncate">{listing.title}</h3>
        <div className="text-[12px] text-muted-foreground mt-0.5">
          <span className="font-display font-bold text-foreground tabular-nums">${listing.price.toFixed(2)}</span>
          <span className="mx-1.5">·</span>
          {listing.viewCount} views
          <span className="mx-1.5">·</span>
          {listing.soldCount} sold
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {(listing.status === 'ACTIVE' || listing.status === 'PAUSED') && (
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={listing.status === 'ACTIVE' ? 'Pause' : 'Resume'}
            className={`grid place-items-center h-9 w-9 rounded-full ring-1 transition-colors ${
              listing.status === 'ACTIVE'
                ? 'bg-warning/10 ring-warning/25 text-warning hover:bg-warning/20'
                : 'bg-success/10 ring-success/25 text-success hover:bg-success/20'
            }`}
          >
            {listing.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="grid place-items-center h-9 w-9 rounded-full bg-muted/25 ring-1 ring-border text-muted-foreground hover:bg-error/15 hover:text-error hover:ring-error/25 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  HELPERS                                                             */
/* ══════════════════════════════════════════════════════════════════ */
function StatusPill({ status }: { status: ListingStatus }) {
  const styles: Record<ListingStatus, { bg: string; label: string }> = {
    ACTIVE: { bg: 'bg-success/15 text-success ring-success/25', label: 'Live' },
    DRAFT: { bg: 'bg-accent/15 text-accent ring-accent/25', label: 'Draft' },
    PAUSED: { bg: 'bg-warning/15 text-warning ring-warning/25', label: 'Paused' },
    SOLD_OUT: { bg: 'bg-muted/40 text-muted-foreground ring-border', label: 'Sold out' },
    REMOVED: { bg: 'bg-error/15 text-error ring-error/25', label: 'Removed' },
    REJECTED: { bg: 'bg-error/15 text-error ring-error/25', label: 'Rejected' },
    PENDING_REVIEW: { bg: 'bg-warning/15 text-warning ring-warning/25', label: 'In review' },
  };
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${s.bg} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold backdrop-blur-sm`}
    >
      {status === 'ACTIVE' && <span className="h-1 w-1 rounded-full bg-success animate-pulse" />}
      {s.label}
    </span>
  );
}

function MiniMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: number | string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-muted/30 text-muted-foreground mb-0.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </div>
      <div className="font-display font-bold text-[13px] tabular-nums leading-none">{value}</div>
      <div className="text-[9.5px] uppercase font-mono tracking-[0.18em] text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'error';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        tone === 'error'
          ? 'text-error hover:bg-error/10'
          : 'text-foreground/85 hover:bg-muted/30 hover:text-foreground'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

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
        <div className="text-[13px] text-muted-foreground">
          Try a different keyword or clear the search.
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
            <Sparkles className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h3 className="font-display text-2xl lg:text-3xl font-extrabold mb-2">
            Create your first drop
          </h3>
          <p className="text-[14px] text-muted-foreground max-w-md mx-auto mb-6">
            Add a Pokémon GO account, a top-up bundle, an item, or a boosting service.
            Buyers will see it on the marketplace within seconds of publishing.
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
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create my first listing
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const labels: Record<Filter, string> = {
    all: 'listings',
    ACTIVE: 'live listings',
    DRAFT: 'drafts',
    PAUSED: 'paused listings',
    SOLD_OUT: 'sold-out listings',
    REMOVED: 'removed listings',
    REJECTED: 'rejected listings',
    PENDING_REVIEW: 'listings in review',
  };

  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-14 w-14 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
        <Filter className="h-6 w-6" />
      </div>
      <div className="font-display font-bold text-lg mb-1">No {labels[filter]}</div>
      <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider">
        Switch filter
      </Badge>
    </div>
  );
}
