'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirror of the Prisma `NotificationType` enum (packages/database).
// Keep in sync when the enum changes.
export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_IN_PROGRESS'
  | 'ORDER_DELIVERED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_EXPIRED'
  | 'REQUEST_NEW_MATCH'
  | 'REQUEST_EXPIRING'
  | 'REQUEST_NEW_OFFER'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_DISPUTED'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_PROCESSED'
  | 'WITHDRAWAL_FAILED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'KYC_REQUIRED'
  | 'KYC_EXPIRING'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESPONSE'
  | 'DISPUTE_RESOLVED'
  | 'NEW_MESSAGE'
  | 'NEW_REVIEW'
  | 'REVIEW_RESPONSE'
  | 'SYSTEM_ALERT'
  | 'ACCOUNT_SECURITY'
  | 'PROMOTIONAL'
  | 'REFERRAL'
  | 'RANK_PROMOTED';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  emailSent: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export function useNotifications(enabled = true, types?: readonly NotificationType[]) {
  const typesParam = types && types.length ? types.join(',') : undefined;
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', typesParam ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get<NotificationListResponse>('/notifications/me/list', {
        params: typesParam ? { types: typesParam } : undefined,
      });
      return data;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useUnreadCount(enabled = true, types?: readonly NotificationType[]) {
  const typesParam = types && types.length ? types.join(',') : undefined;
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count', typesParam ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('/notifications/me/unread-count', {
        params: typesParam ? { types: typesParam } : undefined,
      });
      return data.count;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await api.patch('/notifications/me/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
