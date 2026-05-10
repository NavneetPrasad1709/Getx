'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
  | 'NEW_MESSAGE'
  | 'NEW_REVIEW'
  | 'REVIEW_RESPONSE'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_PROCESSED'
  | 'SYSTEM_ALERT';

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

export function useNotifications(enabled = true) {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<NotificationListResponse>('/notifications/me/list');
      return data;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('/notifications/me/unread-count');
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
