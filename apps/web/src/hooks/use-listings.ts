'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating-desc' | 'popular';

export interface SellerSummary {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  sellerRating: number;
  totalSales: number;
  verifiedTier: string | null;
  isVerified: boolean;
  country: string;
}

export interface SellerDetail extends SellerSummary {
  bio: string | null;
  completionRate: number | null;
  responseTimeMin: number | null;
  createdAt: string;
}

export interface GameSummary {
  slug: string;
  name: string;
  icon: string;
}

export interface Listing {
  id: string;
  sku: string;
  slug: string | null;
  title: string;
  tabType: TabType;
  productType: string;
  price: number;
  currency: string;
  originalPrice: number | null;
  discountPercent: number | null;
  images: string[];
  attributes: Record<string, unknown>;
  deliveryType: string;
  deliveryTime: string | null;
  stock: number;
  soldCount: number;
  viewCount: number;
  favoriteCount: number;
  isFeatured: boolean;
  createdAt: string;
  seller: SellerSummary;
  game: GameSummary;
}

export interface ListingDetail extends Listing {
  description: string;
  videoUrl: string | null;
  searchTags: string[];
  seller: SellerDetail;
}

export interface RelatedListing {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  currency: string;
  images: string[];
  attributes: Record<string, unknown>;
  tabType: TabType;
  productType: string;
  seller: {
    id: string;
    username: string | null;
    name: string | null;
    sellerRating: number;
    verifiedTier: string | null;
  };
}

export interface ListingsResponse {
  data: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: Record<string, unknown>;
}

export interface ListingFilters {
  gameSlug?: string;
  tabType?: TabType;
  page?: number;
  limit?: number;
  sort?: SortOption;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  levelMin?: number;
  levelMax?: number;
  team?: string;
  shinyMin?: number;
  legendaryMin?: number;
  hundoMin?: number;
  region?: string;
  platform?: string;
  // Top-Ups
  coinAmount?: string;
  deliveryMethod?: string;
  // Items
  itemTypes?: string;
  quantityMin?: number;
}

function toQuery(filters: ListingFilters): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  }
  return params.toString();
}

export function useListings(filters: ListingFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: async () => {
      const { data } = await api.get<ListingsResponse>(`/listings?${toQuery(filters)}`);
      return data;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useListing(slug: string) {
  return useQuery({
    queryKey: ['listings', slug],
    queryFn: async () => {
      const { data } = await api.get<ListingDetail>(`/listings/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}

export function useRelatedListings(slug: string) {
  return useQuery({
    queryKey: ['listings', slug, 'related'],
    queryFn: async () => {
      const { data } = await api.get<RelatedListing[]>(`/listings/${slug}/related`);
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
