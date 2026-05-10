'use client';

import { Card, CardContent } from '@getx/ui';
import type { ReviewItem } from '@/hooks/use-reviews';

interface Props {
  review: ReviewItem;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function ReviewCard({ review }: Props) {
  const reviewerName = review.author.username ?? review.author.name ?? 'Anonymous';
  const initial = reviewerName.charAt(0).toUpperCase();

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
              {initial}
            </div>
            <div>
              <div className="font-medium text-sm">{reviewerName}</div>
              <div className="text-xs text-muted-foreground">
                {review.author.country} · {timeAgo(review.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex" aria-label={`Rated ${review.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={i < review.rating ? 'text-warning' : 'text-muted-foreground/30'}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {review.title && <h4 className="font-semibold mb-2">{review.title}</h4>}
        {review.comment && (
          <p className="text-sm whitespace-pre-wrap break-words">{review.comment}</p>
        )}

        {review.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
            {review.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Review attachment ${i + 1}`}
                className="rounded-md aspect-square object-cover border"
              />
            ))}
          </div>
        )}

        {review.order && (
          <div className="text-xs text-muted-foreground mt-3 font-mono">
            Order {review.order.orderNumber}
          </div>
        )}

        {review.response && (
          <div className="mt-4 p-3 bg-muted/40 rounded-md border-l-2 border-primary">
            <div className="text-xs font-medium mb-1">Response from seller</div>
            <p className="text-sm whitespace-pre-wrap break-words">{review.response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
