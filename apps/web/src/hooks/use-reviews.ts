'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ReviewDirection = 'BUYER_REVIEWS_SELLER' | 'SELLER_REVIEWS_BUYER';

export interface ReviewItem {
  id: string;
  orderId: string;
  authorId: string;
  targetId: string;
  direction: ReviewDirection;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    country: string;
  };
  order: { id: string; orderNumber: string; productListingId: string | null };
}

export interface ReviewsResponse {
  data: ReviewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewEligibility {
  canReview: boolean;
  reason?: string;
  direction?: ReviewDirection;
}

export function useReviewsForUser(
  userId: string | null,
  direction: ReviewDirection = 'BUYER_REVIEWS_SELLER',
) {
  return useQuery<ReviewsResponse>({
    queryKey: ['reviews', userId, direction],
    queryFn: async () => {
      const { data } = await api.get<ReviewsResponse>(
        `/reviews/user/${userId}?direction=${direction}`,
      );
      return data;
    },
    enabled: !!userId,
  });
}

export function useReviewEligibility(orderId: string, enabled = true) {
  return useQuery<ReviewEligibility>({
    queryKey: ['review-eligibility', orderId],
    queryFn: async () => {
      const { data } = await api.get<ReviewEligibility>(`/reviews/order/${orderId}/eligibility`);
      return data;
    },
    enabled: enabled && !!orderId,
  });
}

interface CreateReviewPayload {
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation<ReviewItem, Error, CreateReviewPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ReviewItem>('/reviews', payload);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['review-eligibility', vars.orderId] });
    },
  });
}
