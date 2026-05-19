'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

function buildParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export interface DashboardData {
  users: { total: number; newThisWeek: number; activeSellers: number };
  listings: { total: number; active: number };
  orders: { total: number; thisWeek: number };
  gmv: { allTime: number; thisWeek: number };
  revenue: { allTime: number; thisWeek: number };
  pendingPayouts: number;
  totalReviews: number;
  recentAudits: Array<{
    id: string;
    action: string;
    userId: string | null;
    entity: string | null;
    entityId: string | null;
    severity: string;
    createdAt: string;
  }>;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/admin/dashboard');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  country: string;
  role: string;
  status: string;
  isSeller: boolean;
  kycLevel: string;
  sellerRating: number;
  totalSales: number;
  totalReviews: number;
  sellerWallet: number;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: string | null;
}

export function useAdminUsers(filters: Record<string, unknown> = {}) {
  return useQuery<{ data: AdminUserRow[]; pagination: Pagination }>({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users${buildParams(filters)}`);
      return data;
    },
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAdminOrders(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders${buildParams(filters)}`);
      return data;
    },
  });
}

export function useAdminOrder(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAdminListings(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['admin', 'listings', filters],
    queryFn: async () => {
      const { data } = await api.get(`/admin/listings${buildParams(filters)}`);
      return data;
    },
  });
}

export function useAdminReviews(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['admin', 'reviews', filters],
    queryFn: async () => {
      const { data } = await api.get(`/admin/reviews${buildParams(filters)}`);
      return data;
    },
  });
}

/* Action queue — every "what needs me right now" stat the admin sees
   on the dashboard alerts strip. Fans out small list queries (limit=1)
   in parallel so we get accurate counts from `pagination.total` without
   loading rows. Each query is independent so partial failures degrade
   gracefully. */
interface ListResponse {
  data: unknown[];
  pagination: Pagination;
}

export function useAdminAlerts() {
  const disputed = useAdminOrders({ status: 'DISPUTED', limit: 1 }) as {
    data?: ListResponse;
    isLoading: boolean;
  };
  const pendingReview = useAdminListings({ status: 'PENDING_REVIEW', limit: 1 }) as {
    data?: ListResponse;
    isLoading: boolean;
  };
  const removedListings = useAdminListings({ status: 'REMOVED', limit: 1 }) as {
    data?: ListResponse;
    isLoading: boolean;
  };
  const hiddenReviews = useAdminReviews({ hidden: true, limit: 1 }) as {
    data?: ListResponse;
    isLoading: boolean;
  };
  return {
    counts: {
      disputes: disputed.data?.pagination.total ?? 0,
      pendingListings: pendingReview.data?.pagination.total ?? 0,
      removedListings: removedListings.data?.pagination.total ?? 0,
      hiddenReviews: hiddenReviews.data?.pagination.total ?? 0,
    },
    isLoading:
      disputed.isLoading ||
      pendingReview.isLoading ||
      removedListings.isLoading ||
      hiddenReviews.isLoading,
  };
}

export function useAdminAuditLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: async () => {
      const { data } = await api.get(`/admin/audit-logs${buildParams(filters)}`);
      return data;
    },
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { userId: string; reason: string }>({
    mutationFn: async ({ userId, reason }) => {
      const { data } = await api.post(`/admin/users/${userId}/ban`, { reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: async (userId) => {
      const { data } = await api.post(`/admin/users/${userId}/unban`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useForceRelease() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { orderId: string; reason: string }>({
    mutationFn: async ({ orderId, reason }) => {
      const { data } = await api.post(`/admin/orders/${orderId}/force-release`, { reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { orderId: string; reason: string; fullRefund?: boolean; amount?: number }
  >({
    mutationFn: async ({ orderId, reason, fullRefund = true, amount }) => {
      const { data } = await api.post(`/admin/orders/${orderId}/refund`, {
        reason,
        fullRefund,
        amount,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useHideListing() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { listingId: string; reason: string }>({
    mutationFn: async ({ listingId, reason }) => {
      const { data } = await api.post(`/admin/listings/${listingId}/hide`, {
        reason,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useUnhideListing() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: async (listingId) => {
      const { data } = await api.post(`/admin/listings/${listingId}/unhide`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useHideReview() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { reviewId: string; reason: string }>({
    mutationFn: async ({ reviewId, reason }) => {
      const { data } = await api.post(`/admin/reviews/${reviewId}/hide`, {
        reason,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}
