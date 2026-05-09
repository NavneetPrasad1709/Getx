'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SOLD_OUT' | 'REMOVED';

export interface SellerListing {
  id: string;
  sku: string;
  slug: string | null;
  title: string;
  tabType: string;
  productType: string;
  price: number;
  currency: string;
  stock: number;
  status: ListingStatus;
  images: string[];
  attributes: Record<string, unknown>;
  viewCount: number;
  soldCount: number;
  createdAt: string;
  game: { slug: string; name: string; icon: string };
}

export interface CreateListingPayload {
  gameSlug: string;
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
  productType: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  originalPrice?: number;
  stock: number;
  images: string[];
  videoUrl?: string;
  attributes: Record<string, unknown>;
  deliveryType: 'INSTANT' | 'MANUAL' | 'SERVICE';
  deliveryTime?: string;
  searchTags?: string[];
  publish?: boolean;
}

export type UpdateListingPayload = Partial<CreateListingPayload>;

export function useMyListings() {
  return useQuery<SellerListing[]>({
    queryKey: ['seller-listings'],
    queryFn: async () => {
      const { data } = await api.get<SellerListing[]>('/listings/me/list');
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useMyListing(id: string) {
  return useQuery<SellerListing>({
    queryKey: ['seller-listings', id],
    queryFn: async () => {
      const { data } = await api.get<SellerListing>(`/listings/me/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation<SellerListing, Error, CreateListingPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<SellerListing>('/listings', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-listings'] });
    },
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation<SellerListing, Error, { id: string; payload: UpdateListingPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch<SellerListing>(`/listings/${id}`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['seller-listings'] });
      qc.invalidateQueries({ queryKey: ['seller-listings', id] });
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.delete<{ success: boolean }>(`/listings/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-listings'] });
    },
  });
}
