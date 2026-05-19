'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating-desc' | 'popular';

export type Rank =
  | 'ROOKIE'
  | 'RISING'
  | 'TRUSTED'
  | 'PRO'
  | 'ELITE'
  | 'LEGEND';

export interface SellerSummary {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  sellerRating: number;
  totalSales: number;
  verifiedTier: string | null;
  /* Eldorado-style rank ribbon — supersedes verifiedTier. Optional while
     existing rows haven't been backfilled. */
  rank?: Rank | null;
  isVerified: boolean;
  country: string;
  /* Backend-populated soft signal — kept optional so older API responses
     don't break the type. */
  lastSeenAt?: string | null;
  /* Median seller reply time in minutes — used for the "Replies in ~Xm"
     trust chip on listing cards. Optional while the column backfills. */
  responseTimeMin?: number | null;
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

/* A buyable variant tied to a parent listing — used for top-ups (e.g. 5,500 /
   14,500 / 25,000 PokéCoins on one PDP) and boosting tiers (Bronze / Silver
   / Gold league push). Backend should link via `parentListingId` and expose
   the array via `Listing.variants`. */
export interface ListingVariant {
  id: string;
  label: string;
  sublabel?: string | null;
  price: number;
  originalPrice?: number | null;
  stockLeft?: number | null;
  /** Hours-string for boosting tier ETAs, e.g. "6h". */
  deliveryEta?: string | null;
  /** Short callout chip, e.g. "Most popular", "Best value", "Limited". */
  badge?: string | null;
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
  /* Optional urgency signals — surfaced on PDP BuyPanel + MobileBuyBar.
     When absent, the client picks a deterministic stub from listing.id so
     the chip still renders. Backend should populate these fields once the
     deal/timer table lands. */
  endsAt?: string | null;
  stockLeft?: number | null;
  soldRecent?: number | null;
  /* Optional package variants — surfaced via VariantPicker on PDPs. Cheapest
     variant is the default selection. Listings with 0-1 variants render the
     plain BuyPanel. */
  variants?: ListingVariant[] | null;
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
    rank?: Rank | null;
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
  /* Filter to a single seller's storefront — used by /users/[username]. */
  sellerId?: string;
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
