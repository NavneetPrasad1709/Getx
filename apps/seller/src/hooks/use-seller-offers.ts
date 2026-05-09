'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface SellerOffer {
  id: string;
  requestId: string;
  price: number;
  currency: string;
  deliveryHours: number;
  message: string;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
  request: {
    id: string;
    requestNumber: string;
    title: string;
    tabType: string;
    subCategory: string | null;
    status: string;
    game: { slug: string; name: string };
  };
}

export interface CreateOfferPayload {
  requestId: string;
  price: number;
  deliveryHours: number;
  message: string;
}

export function useMyOffers() {
  return useQuery<SellerOffer[]>({
    queryKey: ['seller-offers'],
    queryFn: async () => {
      const { data } = await api.get<SellerOffer[]>('/offers/me/list');
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation<SellerOffer, Error, CreateOfferPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<SellerOffer>('/offers', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-offers'] });
      qc.invalidateQueries({ queryKey: ['seller-requests'] });
    },
  });
}

export function useWithdrawOffer() {
  const qc = useQueryClient();
  return useMutation<SellerOffer, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<SellerOffer>(`/offers/${id}/withdraw`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-offers'] });
    },
  });
}
