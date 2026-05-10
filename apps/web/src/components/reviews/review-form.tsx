'use client';

import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, toast } from '@getx/ui';
import { useCreateReview } from '@/hooks/use-reviews';

interface Props {
  orderId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ orderId, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const submit = useCreateReview();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating');
      return;
    }
    if (content.trim().length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }

    try {
      await submit.mutateAsync({
        orderId,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
      });
      toast.success('Review submitted. Thank you!');
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to submit review');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leave a review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Rating</label>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} stars`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl leading-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <span aria-hidden="true">{filled ? '★' : '☆'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">
              Title <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary"
              maxLength={150}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Your review</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience with this transaction…"
              rows={5}
              maxLength={2000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length}/2000</p>
          </div>

          <Button type="submit" disabled={submit.isPending} className="w-full">
            {submit.isPending ? 'Submitting…' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
