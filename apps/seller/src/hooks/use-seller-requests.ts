'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface OpenRequestItem {
  id: string;
  requestNumber: string;
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';
  subCategory: string | null;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  attributes: Record<string, unknown>;
  deliveryDays: number;
  offerCount: number;
  expiresAt: string;
  buyer: {
    id: string;
    username: string | null;
    name: string | null;
    country: string;
  };
  game: { slug: string; name: string; icon: string };
}

export interface OpenRequestsResponse {
  data: OpenRequestItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface RequestFilters {
  gameSlug?: string;
  tabType?: string;
  page?: number;
  limit?: number;
}

export function useOpenRequests(filters: RequestFilters = {}) {
  return useQuery<OpenRequestsResponse>({
    queryKey: ['seller-requests', 'open', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined) params.set(k, String(v));
      }
      params.set('status', 'OPEN');
      const { data } = await api.get<OpenRequestsResponse>(`/custom-requests?${params.toString()}`);
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export interface RequestOffer {
  id: string;
  sellerId: string;
  price: number;
  currency: string;
  deliveryHours: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
}

export interface RequestDetail {
  id: string;
  requestNumber: string;
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';
  subCategory: string | null;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  attributes: Record<string, unknown>;
  deliveryDays: number;
  status: string;
  expiresAt: string;
  offerCount: number;
  buyer: {
    id: string;
    username: string | null;
    name: string | null;
    country: string;
  };
  game: { slug: string; name: string };
  offers?: RequestOffer[];
}

export function useRequest(id: string) {
  return useQuery<RequestDetail>({
    queryKey: ['seller-requests', id],
    queryFn: async () => {
      const { data } = await api.get<RequestDetail>(`/custom-requests/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
