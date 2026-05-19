'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type RequestStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'AWAITING_CHOICE'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

export type RequestTabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';

export interface RequestBuyer {
  id: string;
  username: string | null;
  name: string | null;
  country: string;
  avatar: string | null;
  createdAt?: string;
}

export interface RequestGame {
  slug: string;
  name: string;
  icon: string;
}

export interface OfferSeller {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  sellerRating: number;
  totalSales: number;
  completionRate: number | null;
  verifiedTier: string | null;
  rank?:
    | 'ROOKIE'
    | 'RISING'
    | 'TRUSTED'
    | 'PRO'
    | 'ELITE'
    | 'LEGEND'
    | null;
  country: string;
}

export interface RequestOffer {
  id: string;
  price: number;
  currency: string;
  deliveryHours: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  expiresAt: string;
  createdAt: string;
  seller: OfferSeller;
}

export interface CustomRequest {
  id: string;
  requestNumber: string;
  tabType: RequestTabType;
  subCategory: string | null;
  title: string;
  description: string;
  images: string[];
  budgetMin: number;
  budgetMax: number;
  currency: string;
  attributes: Record<string, unknown>;
  addons?: Record<string, unknown>;
  deliveryDays: number;
  platform: string | null;
  status: RequestStatus;
  expiresAt: string;
  viewCount: number;
  offerCount: number;
  createdAt: string;
  buyerId?: string;
  buyer: RequestBuyer;
  game: RequestGame;
  offers?: RequestOffer[];
  _count?: { offers: number };
}

export interface CreateRequestPayload {
  gameSlug: string;
  tabType: RequestTabType;
  subCategory?: string;
  title: string;
  description: string;
  images?: string[];
  budgetMin: number;
  budgetMax: number;
  currency?: string;
  attributes?: Record<string, unknown>;
  addons?: Record<string, boolean>;
  deliveryDays?: number;
  platform?: string;
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation<CustomRequest, Error, CreateRequestPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<CustomRequest>('/custom-requests', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-requests'] });
      qc.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
}

export function useMyRequests() {
  return useQuery<CustomRequest[]>({
    queryKey: ['my-requests'],
    queryFn: async () => {
      const { data } = await api.get<CustomRequest[]>('/custom-requests/me/list');
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useRequest(id: string) {
  return useQuery<CustomRequest>({
    queryKey: ['custom-requests', id],
    queryFn: async () => {
      const { data } = await api.get<CustomRequest>(`/custom-requests/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation<CustomRequest, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<CustomRequest>(`/custom-requests/${id}/cancel`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['custom-requests', id] });
      qc.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
}
