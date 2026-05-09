import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { ListListingsDto } from './dto/list-listings.dto';

const LIST_SELECT = {
  id: true,
  sku: true,
  slug: true,
  title: true,
  tabType: true,
  productType: true,
  price: true,
  currency: true,
  originalPrice: true,
  discountPercent: true,
  images: true,
  attributes: true,
  deliveryType: true,
  deliveryTime: true,
  stock: true,
  soldCount: true,
  viewCount: true,
  favoriteCount: true,
  isFeatured: true,
  createdAt: true,
  seller: {
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      sellerRating: true,
      totalSales: true,
      verifiedTier: true,
      isVerified: true,
      country: true,
    },
  },
  game: {
    select: {
      slug: true,
      name: true,
      icon: true,
    },
  },
} satisfies Prisma.ProductListingSelect;

const DETAIL_INCLUDE = {
  seller: {
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      bio: true,
      sellerRating: true,
      totalSales: true,
      completionRate: true,
      responseTimeMin: true,
      verifiedTier: true,
      isVerified: true,
      country: true,
      createdAt: true,
    },
  },
  game: {
    select: {
      slug: true,
      name: true,
      icon: true,
    },
  },
} satisfies Prisma.ProductListingInclude;

const RELATED_SELECT = {
  id: true,
  slug: true,
  title: true,
  price: true,
  currency: true,
  images: true,
  attributes: true,
  tabType: true,
  productType: true,
  seller: {
    select: {
      id: true,
      username: true,
      name: true,
      sellerRating: true,
      verifiedTier: true,
    },
  },
} satisfies Prisma.ProductListingSelect;

export type ListingListItem = Prisma.ProductListingGetPayload<{
  select: typeof LIST_SELECT;
}>;
export type ListingDetail = Prisma.ProductListingGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;
export type RelatedListing = Prisma.ProductListingGetPayload<{
  select: typeof RELATED_SELECT;
}>;

export interface ListListingsResponse {
  data: ListingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    gameSlug?: string;
    tabType?: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
    sort: ListListingsDto['sort'];
    priceMin?: number;
    priceMax?: number;
  };
}

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async listListings(filters: ListListingsDto): Promise<ListListingsResponse> {
    const where: Prisma.ProductListingWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (filters.gameSlug) {
      where.game = { slug: filters.gameSlug, isActive: true };
    }

    if (filters.tabType) {
      where.tabType = filters.tabType;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) where.price.gte = filters.priceMin;
      if (filters.priceMax !== undefined) where.price.lte = filters.priceMax;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.tabType === 'ACCOUNTS') {
      const attrFilters: Prisma.ProductListingWhereInput[] = [];

      if (filters.levelMin !== undefined) {
        attrFilters.push({
          attributes: {
            path: ['level'],
            gte: filters.levelMin,
          },
        });
      }
      if (filters.levelMax !== undefined) {
        attrFilters.push({
          attributes: {
            path: ['level'],
            lte: filters.levelMax,
          },
        });
      }
      if (filters.team) {
        const teams = filters.team
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        if (teams.length > 0) {
          attrFilters.push({
            OR: teams.map((t) => ({
              attributes: {
                path: ['team'],
                equals: t,
              },
            })),
          });
        }
      }
      if (filters.shinyMin !== undefined) {
        attrFilters.push({
          attributes: {
            path: ['shinyCount'],
            gte: filters.shinyMin,
          },
        });
      }
      if (filters.legendaryMin !== undefined) {
        attrFilters.push({
          attributes: {
            path: ['legendaryCount'],
            gte: filters.legendaryMin,
          },
        });
      }
      if (filters.hundoMin !== undefined) {
        attrFilters.push({
          attributes: {
            path: ['hundoCount'],
            gte: filters.hundoMin,
          },
        });
      }
      if (filters.region) {
        attrFilters.push({
          attributes: {
            path: ['region'],
            equals: filters.region,
          },
        });
      }
      if (filters.platform) {
        attrFilters.push({
          attributes: {
            path: ['platform'],
            equals: filters.platform,
          },
        });
      }

      if (attrFilters.length > 0) {
        where.AND = attrFilters;
      }
    }

    const orderBy: Prisma.ProductListingOrderByWithRelationInput = (() => {
      switch (filters.sort) {
        case 'price-asc':
          return { price: 'asc' };
        case 'price-desc':
          return { price: 'desc' };
        case 'popular':
          return { viewCount: 'desc' };
        case 'rating-desc':
          return { seller: { sellerRating: 'desc' } };
        case 'newest':
        default:
          return { createdAt: 'desc' };
      }
    })();

    const skip = (filters.page - 1) * filters.limit;

    const [listings, totalCount] = await Promise.all([
      this.prisma.productListing.findMany({
        where,
        orderBy,
        skip,
        take: filters.limit,
        select: LIST_SELECT,
      }),
      this.prisma.productListing.count({ where }),
    ]);

    return {
      data: listings,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / filters.limit)),
        hasNext: filters.page * filters.limit < totalCount,
        hasPrev: filters.page > 1,
      },
      filters: {
        gameSlug: filters.gameSlug,
        tabType: filters.tabType,
        sort: filters.sort,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
      },
    };
  }

  async getListingBySlug(slug: string): Promise<ListingDetail> {
    const listing = await this.prisma.productListing.findUnique({
      where: { slug },
      include: DETAIL_INCLUDE,
    });

    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'ACTIVE')
      throw new NotFoundException('Listing not available');
    if (listing.deletedAt) throw new NotFoundException('Listing removed');

    // Fire-and-forget view increment so the response isn't blocked.
    void this.prisma.productListing
      .update({
        where: { id: listing.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {
        /* swallow — view counts are best-effort */
      });

    return listing;
  }

  async getRelatedListings(
    listingId: string,
    limit = 6,
  ): Promise<RelatedListing[]> {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
      select: { gameId: true, tabType: true, price: true },
    });

    if (!listing) return [];

    return this.prisma.productListing.findMany({
      where: {
        gameId: listing.gameId,
        tabType: listing.tabType,
        status: 'ACTIVE',
        deletedAt: null,
        id: { not: listingId },
        price: {
          gte: listing.price * 0.5,
          lte: listing.price * 1.5,
        },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: RELATED_SELECT,
    });
  }
}
