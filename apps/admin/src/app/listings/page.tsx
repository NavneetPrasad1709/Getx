'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  EyeOff,
  Eye as EyeOpen,
  Loader2,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { Input, Skeleton, motion, toast } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminListings, useHideListing, useUnhideListing } from '@/hooks/use-admin';
import { extractMessage } from '@/lib/api-error';
import { PaginationButton } from '@/components/ui/pagination-button';

/* GETX Admin — Listings moderation queue.
   ─────────────────────────────────────────────────────────────────────
   Lands here from the dashboard for `?status=PENDING_REVIEW` or
   `?status=REMOVED`. Inline hide/unhide flow with reason capture.
*/

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'PENDING_REVIEW', label: 'Pending review' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'SOLD_OUT', label: 'Sold out' },
  { key: 'REMOVED', label: 'Removed' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

interface ListingRow {
  id: string;
  title: string;
  sku: string;
  status: string;
  price: number;
  game: { name: string; slug: string };
  seller: { id: string; username: string | null; name: string | null };
}

export default function AdminListingsPage() {
  const sp = useSearchParams();
  const initialStatus = sp.get('status') ?? '';
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [query, setQuery] = useState('');
  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');
  // SAP-007: inline confirm state replaces native confirm() for unhide action
  const [unhideConfirmTarget, setUnhideConfirmTarget] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(sp.get('status') ?? '');
    setPage(1);
  }, [sp]);

  const { data, isLoading, refetch } = useAdminListings({
    page,
    status: statusFilter || undefined,
  });
  const hide = useHideListing();
  const unhide = useUnhideListing();

  const handleHide = async (listingId: string) => {
    if (hideReason.trim().length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await hide.mutateAsync({ listingId, reason: hideReason });
      toast.success('Listing hidden');
      setHideTarget(null);
      setHideReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Hide failed');
    }
  };

  const handleUnhide = async (listingId: string) => {
    try {
      await unhide.mutateAsync(listingId);
      toast.success('Listing restored');
      setUnhideConfirmTarget(null);
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Unhide failed');
    }
  };

  const rows = (data?.data ?? []) as ListingRow[];
  const filtered = query.trim()
    ? rows.filter((l) => {
        const q = query.toLowerCase();
        return (
          l.title.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          (l.seller.username ?? l.seller.name ?? '').toLowerCase().includes(q)
        );
      })
    : rows;
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
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
              Moderation · listings
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
              Listings
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">
              {statusFilter === 'PENDING_REVIEW'
                ? 'Review the queue — approve fast or hide with a reason.'
                : 'Every listing in the marketplace. Hide for policy violations, unhide on review.'}
            </p>
          </div>
        </motion.div>

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
                      relative inline-flex items-center h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
                      ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                    `}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-listings-pill"
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
                placeholder="Title, SKU, seller"
                className="h-9 w-52 sm:w-72 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((listing, idx) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3, ease: EASE }}
              >
                <ListingRowCard
                  listing={listing}
                  isHiding={hideTarget === listing.id}
                  hideReason={hideReason}
                  setHideReason={setHideReason}
                  setHideTarget={setHideTarget}
                  onHide={() => handleHide(listing.id)}
                  onUnhide={() => handleUnhide(listing.id)}
                  hidePending={hide.isPending}
                  unhidePending={unhide.isPending}
                  isConfirmingUnhide={unhideConfirmTarget === listing.id}
                  onRequestUnhide={() => setUnhideConfirmTarget(listing.id)}
                  onCancelUnhide={() => setUnhideConfirmTarget(null)}
                />
              </motion.div>
            ))}
          </div>
        )}

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
/*  LISTING ROW CARD                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function ListingRowCard({
  listing,
  isHiding,
  hideReason,
  setHideReason,
  setHideTarget,
  onHide,
  onUnhide,
  hidePending,
  unhidePending,
  isConfirmingUnhide,
  onRequestUnhide,
  onCancelUnhide,
}: {
  listing: ListingRow;
  isHiding: boolean;
  hideReason: string;
  setHideReason: (v: string) => void;
  setHideTarget: (v: string | null) => void;
  onHide: () => void;
  onUnhide: () => void;
  hidePending: boolean;
  unhidePending: boolean;
  isConfirmingUnhide: boolean;
  onRequestUnhide: () => void;
  onCancelUnhide: () => void;
}) {
  const meta = STATUS_META[listing.status] ?? STATUS_META.ACTIVE;
  const removed = listing.status === 'REMOVED';
  const pending = listing.status === 'PENDING_REVIEW';

  return (
    <div
      className={`
        relative rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${pending ? 'ring-warning/30' : removed ? 'ring-error/25' : 'ring-border'}
      `}
    >
      <div aria-hidden className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.stripe}`} />

      <div className="flex items-center gap-3 sm:gap-4 p-4 pl-5">
        <div className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${meta.iconBg}`}>
          <Tag className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="font-semibold text-[14px] truncate">{listing.title}</div>
            <div className="font-mono text-[11px] text-muted-foreground truncate">
              {listing.sku} · {listing.game.name}
            </div>
            <div className="mt-1 inline-flex">
              <StatusPill status={listing.status} />
            </div>
          </div>
          <div className="text-[12px] hidden lg:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1">
              Seller
            </div>
            <div className="font-semibold truncate">
              {listing.seller.username ?? listing.seller.name ?? '—'}
            </div>
          </div>
          <div className="text-right lg:text-left">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              Price
            </div>
            <div className="font-display font-extrabold text-[18px] tabular-nums leading-none mt-0.5">
              ${listing.price.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end col-span-1 lg:col-span-1">
            {isHiding ? (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Input
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Reason (min 5)"
                  className="h-9 text-[12.5px] w-full sm:w-44"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setHideTarget(null);
                    setHideReason('');
                  }}
                  className="grid place-items-center h-9 w-9 rounded-full bg-muted/25 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label="Cancel hide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onHide}
                  disabled={hidePending}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-gradient-to-b from-error to-error text-error-foreground text-[12px] font-bold shadow-[0_6px_18px_-4px_hsl(var(--error)/0.45)] disabled:opacity-50 transition-opacity shrink-0"
                >
                  {hidePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Hide'}
                </button>
              </div>
            ) : removed ? (
              // SAP-007: inline confirm replaces native confirm() for unhide
              isConfirmingUnhide ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-foreground">Restore?</span>
                  <button
                    type="button"
                    onClick={onCancelUnhide}
                    className="h-9 px-3 rounded-full bg-muted/25 hover:bg-muted/40 text-[12px] font-semibold transition-colors"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={onUnhide}
                    disabled={unhidePending}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-success/10 ring-1 ring-success/25 text-success text-[12px] font-bold hover:bg-success/20 disabled:opacity-50 transition-colors"
                  >
                    {unhidePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, restore'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onRequestUnhide}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-success/10 ring-1 ring-success/25 text-success text-[12px] font-bold hover:bg-success/20 transition-colors"
                >
                  <EyeOpen className="h-3.5 w-3.5" />
                  Unhide
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  setHideTarget(listing.id);
                  setHideReason('');
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-error/10 ring-1 ring-error/25 text-error text-[12px] font-bold hover:bg-error/20 transition-colors"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STATUS META                                                         */
/* ══════════════════════════════════════════════════════════════════ */
const STATUS_META: Record<string, { pill: string; stripe: string; iconBg: string }> = {
  DRAFT: {
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
    iconBg: 'bg-muted/30 text-muted-foreground',
  },
  PENDING_REVIEW: {
    pill: 'bg-warning/15 text-warning ring-warning/25',
    stripe: 'bg-warning',
    iconBg: 'bg-warning/15 text-warning',
  },
  ACTIVE: {
    pill: 'bg-success/15 text-success ring-success/25',
    stripe: 'bg-success',
    iconBg: 'bg-success/15 text-success',
  },
  PAUSED: {
    pill: 'bg-warning/15 text-warning ring-warning/25',
    stripe: 'bg-warning',
    iconBg: 'bg-warning/15 text-warning',
  },
  SOLD_OUT: {
    pill: 'bg-muted/40 text-muted-foreground ring-border',
    stripe: 'bg-muted/60',
    iconBg: 'bg-muted/30 text-muted-foreground',
  },
  REMOVED: {
    pill: 'bg-error/15 text-error ring-error/25',
    stripe: 'bg-error',
    iconBg: 'bg-error/15 text-error',
  },
  REJECTED: {
    pill: 'bg-error/15 text-error ring-error/25',
    stripe: 'bg-error',
    iconBg: 'bg-error/15 text-error',
  },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.ACTIVE;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ${meta.pill} font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
        {query.trim() ? <Search className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </div>
      <div className="font-display font-bold text-[15px] mb-1">
        {query.trim() ? `No matches for "${query}"` : 'No listings in this bucket'}
      </div>
      <div className="text-[13px] text-muted-foreground">Switch filter to see more.</div>
    </div>
  );
}

void AlertTriangle; // reserved for future
