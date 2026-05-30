'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  EyeOff,
  Loader2,
  MessageSquareWarning,
  Star,
  X,
} from 'lucide-react';
import { Input, Skeleton, motion, toast } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminReviews, useHideReview } from '@/hooks/use-admin';
import { extractMessage } from '@/lib/api-error';
import { timeAgo } from '@/lib/time';
import { PaginationButton } from '@/components/ui/pagination-button';

/* GETX Admin — Reviews moderation.
   ─────────────────────────────────────────────────────────────────────
   Two views: Visible (default) and Hidden. Inline hide flow with
   reason capture — hiding a review recomputes the seller's rating
   server-side. */

const EASE = [0.22, 1, 0.36, 1] as const;

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isHidden: boolean;
  direction: 'BUYER_REVIEWS_SELLER' | 'SELLER_REVIEWS_BUYER';
  createdAt: string;
  author: { username: string | null; name: string | null };
  target: { username: string | null; name: string | null };
  order: { id: string; orderNumber: string };
}

export default function AdminReviewsPage() {
  const sp = useSearchParams();
  const initialHidden = sp.get('hidden') === 'true';
  const [page, setPage] = useState(1);
  const [showHidden, setShowHidden] = useState<boolean>(initialHidden);
  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');

  useEffect(() => {
    setShowHidden(sp.get('hidden') === 'true');
    setPage(1);
  }, [sp]);

  const { data, isLoading, refetch } = useAdminReviews({
    page,
    hidden: showHidden,
  });
  const hide = useHideReview();

  const handleHide = async (reviewId: string) => {
    if (hideReason.trim().length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await hide.mutateAsync({ reviewId, reason: hideReason });
      toast.success('Review hidden — rating recomputed');
      setHideTarget(null);
      setHideReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Hide failed');
    }
  };

  const rows = (data?.data ?? []) as ReviewRow[];
  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;

  return (
    <AdminShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-5xl mx-auto space-y-5 lg:space-y-6"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
              Moderation · reviews
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
              Reviews
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">
              {showHidden
                ? 'Hidden reviews — kept for audit, excluded from seller ratings.'
                : 'Public reviews on the marketplace. Hide if policy is broken.'}
            </p>
          </div>
        </motion.div>

        {/* Toggle visible / hidden */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-background/85 backdrop-blur-xl border-b border-border"
        >
          <div className="flex items-center gap-1.5">
            <FilterPill active={!showHidden} onClick={() => setShowHidden(false)} label="Visible" />
            <FilterPill active={showHidden} onClick={() => setShowHidden(true)} label="Hidden" />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState hidden={showHidden} />
        ) : (
          <div className="space-y-3">
            {rows.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3, ease: EASE }}
              >
                <ReviewCard
                  review={review}
                  isHiding={hideTarget === review.id}
                  hideReason={hideReason}
                  setHideReason={setHideReason}
                  setHideTarget={setHideTarget}
                  onHide={() => handleHide(review.id)}
                  hidePending={hide.isPending}
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

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`
        relative inline-flex items-center h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors
        ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
      `}
    >
      {active && (
        <motion.span
          layoutId="admin-reviews-pill"
          className="absolute inset-0 -z-10 rounded-full bg-surface ring-1 ring-border shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.15)]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      {label}
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  REVIEW CARD                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function ReviewCard({
  review,
  isHiding,
  hideReason,
  setHideReason,
  setHideTarget,
  onHide,
  hidePending,
}: {
  review: ReviewRow;
  isHiding: boolean;
  hideReason: string;
  setHideReason: (v: string) => void;
  setHideTarget: (v: string | null) => void;
  onHide: () => void;
  hidePending: boolean;
}) {
  const author = review.author.username ?? review.author.name ?? '—';
  const target = review.target.username ?? review.target.name ?? '—';
  const lowRating = review.rating <= 2;

  return (
    <div
      className={`
        relative rounded-2xl bg-surface ring-1 overflow-hidden transition-all
        ${review.isHidden ? 'ring-error/25 opacity-80' : lowRating ? 'ring-warning/30' : 'ring-border'}
      `}
    >
      <div
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          review.isHidden ? 'bg-error' : lowRating ? 'bg-warning' : 'bg-success'
        }`}
      />
      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-0.5 text-warning text-[13px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-current' : 'opacity-30'}`}
                  strokeWidth={2}
                />
              ))}
              <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.18em] font-bold tabular-nums text-foreground">
                {review.rating}/5
              </span>
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/30 ring-1 ring-border font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/80 font-bold">
              {review.direction === 'BUYER_REVIEWS_SELLER' ? 'Buyer → Seller' : 'Seller → Buyer'}
            </span>
            {review.isHidden && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-error/15 text-error font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
                <EyeOff className="h-2.5 w-2.5" strokeWidth={2.5} />
                Hidden
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {timeAgo(review.createdAt)}
          </span>
        </div>

        <div className="text-[12.5px] mb-2">
          <span className="font-semibold text-foreground">{author}</span>
          <ArrowRight className="inline h-3 w-3 mx-1.5 text-muted-foreground" />
          <span className="font-semibold text-foreground">{target}</span>
          <span className="text-muted-foreground"> · order </span>
          <span className="font-mono text-foreground/80">{review.order.orderNumber}</span>
        </div>

        {review.title && (
          <h4 className="font-display font-bold text-[14px] mb-1">{review.title}</h4>
        )}
        {review.comment && (
          <p className="text-[13px] whitespace-pre-wrap break-words text-foreground/85 leading-relaxed">
            {review.comment}
          </p>
        )}

        {!review.isHidden && (
          <div className="mt-4 pt-4 border-t border-border">
            {isHiding ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Input
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Reason for hiding (min 5 chars)"
                  className="h-9 text-[12.5px] flex-1 min-w-[200px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setHideTarget(null);
                    setHideReason('');
                  }}
                  className="grid place-items-center h-9 w-9 rounded-full bg-muted/25 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onHide}
                  disabled={hidePending}
                  className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-gradient-to-b from-error to-error text-error-foreground text-[12px] font-bold shadow-[0_6px_18px_-4px_hsl(var(--error)/0.45)] disabled:opacity-50 transition-opacity"
                >
                  {hidePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Hide review'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setHideTarget(review.id);
                  setHideReason('');
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-error/10 ring-1 ring-error/25 text-error text-[12px] font-bold hover:bg-error/20 transition-colors"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide review
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hidden }: { hidden: boolean }) {
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
      <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-3">
        <MessageSquareWarning className="h-5 w-5" />
      </div>
      <div className="font-display font-bold text-[15px] mb-1">
        {hidden ? 'No hidden reviews' : 'No reviews yet'}
      </div>
      <div className="text-[13px] text-muted-foreground">
        {hidden ? 'Nothing has been moderated out.' : 'The marketplace is just getting started.'}
      </div>
    </div>
  );
}
