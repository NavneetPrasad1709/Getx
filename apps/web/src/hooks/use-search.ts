'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Listing, ListingsResponse } from './use-listings';

/* Federated search hook — backs the /search page. Four parallel queries:
   1. Listings via existing /listings?search= (cross-tabType)
   2. Sellers via /users/search?q=
   3. Games via /games/search?q=
   4. Open custom requests via /custom-requests?q=
   Each is its own useQuery so individual failures don't blank the page. */

export interface SearchSeller {
  id: string;
  username: string | null;
  name: string | null;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  country: string;
  sellerRating: number;
  totalSales: number;
  totalReviews: number;
  verifiedTier: string | null;
  isVerified: boolean;
  rank: string;
  isOnline: boolean;
}

export interface SearchGame {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  icon: string;
  banner: string | null;
  isLaunched: boolean;
  totalListings: number;
  totalSellers: number;
}

const MIN_QUERY_LENGTH = 2;

export function useSearchListings(q: string, enabled = true) {
  return useQuery<{ data: Listing[]; total: number }>({
    queryKey: ['search', 'listings', q],
    queryFn: async () => {
      const { data } = await api.get<ListingsResponse>(
        `/listings?search=${encodeURIComponent(q)}&limit=12`,
      );
      return { data: data.data, total: data.pagination.total };
    },
    enabled: enabled && q.trim().length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });
}

export function useSearchSellers(q: string, enabled = true) {
  return useQuery<SearchSeller[]>({
    queryKey: ['search', 'sellers', q],
    queryFn: async () => {
      const { data } = await api.get<SearchSeller[]>(
        `/users/search?q=${encodeURIComponent(q)}&limit=12`,
      );
      return data;
    },
    enabled: enabled && q.trim().length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });
}

export function useSearchGames(q: string, enabled = true) {
  return useQuery<SearchGame[]>({
    queryKey: ['search', 'games', q],
    queryFn: async () => {
      const { data } = await api.get<SearchGame[]>(
        `/games/search?q=${encodeURIComponent(q)}&limit=6`,
      );
      return data;
    },
    enabled: enabled && q.trim().length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
}

export interface SearchRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  tabType: string;
  subCategory: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  expiresAt: string;
  offerCount: number;
  createdAt: string;
  game: { slug: string; name: string; icon: string | null };
  buyer: { username: string | null; name: string | null };
}

interface RequestsListResponse {
  data: SearchRequest[];
  pagination: { total: number };
}

/* Public open custom-requests matching the query — uses the same
   `GET /custom-requests` endpoint as the request board, scoped to
   OPEN status (the default when `status` is omitted). */
export function useSearchRequests(q: string, enabled = true) {
  return useQuery<{ data: SearchRequest[]; total: number }>({
    queryKey: ['search', 'requests', q],
    queryFn: async () => {
      const { data } = await api.get<RequestsListResponse>(
        `/custom-requests?q=${encodeURIComponent(q)}&limit=10`,
      );
      return { data: data.data, total: data.pagination.total };
    },
    enabled: enabled && q.trim().length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });
}
