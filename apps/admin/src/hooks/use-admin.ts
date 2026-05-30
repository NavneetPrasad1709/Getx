'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
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

// ── SAP-014: Zod response schemas ──────────────────────────────────────
// Single source of truth for API shapes. TypeScript types derived from
// these so the frontend never drifts from what the API actually returns.

const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const AdminUserRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  country: z.string(),
  role: z.string(),
  status: z.string(),
  isSeller: z.boolean(),
  kycLevel: z.string(),
  sellerRating: z.number(),
  totalSales: z.number(),
  totalReviews: z.number(),
  sellerWallet: z.number().or(z.instanceof(Object)).transform(Number),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
  emailVerified: z.string().nullable(),
  bannedBy: z.string().nullable().optional(),
  banReason: z.string().nullable().optional(),
});

export type AdminUserRow = z.infer<typeof AdminUserRowSchema>;

const UserListResponseSchema = z.object({
  data: z.array(AdminUserRowSchema),
  pagination: PaginationSchema,
});

const DashboardSchema = z.object({
  users: z.object({ total: z.number(), newThisWeek: z.number(), activeSellers: z.number() }),
  listings: z.object({ total: z.number(), active: z.number() }),
  orders: z.object({ total: z.number(), thisWeek: z.number() }),
  gmv: z.object({ allTime: z.number().or(z.instanceof(Object)).transform(Number), thisWeek: z.number().or(z.instanceof(Object)).transform(Number) }),
  revenue: z.object({ allTime: z.number().or(z.instanceof(Object)).transform(Number), thisWeek: z.number().or(z.instanceof(Object)).transform(Number) }),
  pendingPayouts: z.number().or(z.instanceof(Object)).transform(Number),
  totalReviews: z.number(),
  recentAudits: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      userId: z.string().nullable(),
      entity: z.string().nullable(),
      entityId: z.string().nullable(),
      severity: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export type DashboardData = z.infer<typeof DashboardSchema>;

const AlertsCountsSchema = z.object({
  disputes: z.number(),
  pendingListings: z.number(),
  removedListings: z.number(),
  hiddenReviews: z.number(),
});

export type AlertsCounts = z.infer<typeof AlertsCountsSchema>;

// ── Queries ─────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard');
      return DashboardSchema.parse(data);
    },
    refetchInterval: 60_000,
  });
}

export type Pagination = z.infer<typeof PaginationSchema>;

export function useAdminUsers(filters: Record<string, unknown> = {}) {
  return useQuery<z.infer<typeof UserListResponseSchema>>({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users${buildParams(filters)}`);
      return UserListResponseSchema.parse(data);
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

// SAP-013: single query replaces 4 parallel limit=1 calls. 30s refetch
// keeps the action-queue tiles live without hammering the DB.
export function useAdminAlertsCounts() {
  return useQuery<AlertsCounts>({
    queryKey: ['admin', 'alerts-counts'],
    queryFn: async () => {
      const { data } = await api.get('/admin/alerts-counts');
      return AlertsCountsSchema.parse(data);
    },
    refetchInterval: 30_000,
  });
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

// ── Mutations ─────────────────────────────────────────────────────────

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
