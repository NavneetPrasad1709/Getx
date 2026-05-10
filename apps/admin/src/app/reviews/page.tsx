'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Badge, Button, Card, CardContent, Input, Skeleton, toast } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import { useAdminReviews, useHideReview } from '@/hooks/use-admin';

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

function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export default function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [showHidden, setShowHidden] = useState(false);
  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');

  const { data, isLoading, refetch } = useAdminReviews({
    page,
    hidden: showHidden,
  });
  const hide = useHideReview();

  const handleHide = async (reviewId: string) => {
    if (hideReason.length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await hide.mutateAsync({ reviewId, reason: hideReason });
      toast.success('Review hidden, rating recomputed');
      setHideTarget(null);
      setHideReason('');
      void refetch();
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Hide failed');
    }
  };

  return (
    <AdminShell>
      <div className="container max-w-5xl py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Reviews</h1>

        <Card className="mb-6">
          <CardContent className="p-4 flex gap-3 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => {
                  setShowHidden(e.target.checked);
                  setPage(1);
                }}
              />
              Show only hidden reviews
            </label>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : !data || data.data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">No reviews</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(data.data as ReviewRow[]).map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="text-sm">
                      <span className="font-medium">
                        {review.author.username ?? review.author.name}
                      </span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">
                        {review.target.username ?? review.target.name}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {review.direction === 'BUYER_REVIEWS_SELLER' ? 'B→S' : 'S→B'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-warning">{'★'.repeat(review.rating)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {review.title && <h4 className="font-semibold text-sm mb-1">{review.title}</h4>}
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground/80">
                    {review.comment}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2 font-mono">
                    Order {review.order.orderNumber}
                  </div>

                  {!review.isHidden && (
                    <div className="mt-3">
                      {hideTarget === review.id ? (
                        <div className="flex gap-2 max-w-md">
                          <Input
                            value={hideReason}
                            onChange={(e) => setHideReason(e.target.value)}
                            placeholder="Reason for hiding"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              setHideTarget(null);
                              setHideReason('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={() => handleHide(review.id)} disabled={hide.isPending}>
                            {hide.isPending ? '…' : 'Hide'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHideTarget(review.id);
                            setHideReason('');
                          }}
                        >
                          Hide review
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 items-center">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
