import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ListListingsDto } from './dto/list-listings.dto';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';

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
      rank: true,
      isVerified: true,
      country: true,
      lastSeenAt: true,
      responseTimeMin: true,
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
      rank: true,
      isVerified: true,
      country: true,
      createdAt: true,
      lastSeenAt: true,
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

const MY_LIST_SELECT = {
  id: true,
  sku: true,
  slug: true,
  title: true,
  tabType: true,
  productType: true,
  price: true,
  currency: true,
  stock: true,
  status: true,
  images: true,
  attributes: true,
  viewCount: true,
  soldCount: true,
  createdAt: true,
  game: { select: { slug: true, name: true, icon: true } },
} satisfies Prisma.ProductListingSelect;

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
      rank: true,
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
export type MyListingItem = Prisma.ProductListingGetPayload<{
  select: typeof MY_LIST_SELECT;
}>;
export type MyListingDetail = Prisma.ProductListingGetPayload<{
  include: { game: true };
}>;
export type SellerListingRow = Prisma.ProductListingGetPayload<object>;

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
  constructor(
    private prisma: PrismaService,
    private loyalty: LoyaltyService,
  ) {}

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

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
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

    if (filters.tabType === 'TOP_UPS') {
      const attrFilters: Prisma.ProductListingWhereInput[] = [];

      if (filters.coinAmount) {
        attrFilters.push({
          attributes: {
            path: ['coinAmount'],
            equals: filters.coinAmount,
          },
        });
      }
      if (filters.deliveryMethod) {
        attrFilters.push({
          attributes: {
            path: ['deliveryMethod'],
            equals: filters.deliveryMethod,
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

    if (filters.tabType === 'ITEMS') {
      const attrFilters: Prisma.ProductListingWhereInput[] = [];

      if (filters.itemTypes) {
        const types = filters.itemTypes
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        if (types.length > 0) {
          attrFilters.push({
            OR: types.map((t) => ({
              attributes: {
                path: ['itemTypes'],
                array_contains: t,
              },
            })),
          });
        }
      }
      if (filters.quantityMin !== undefined) {
        attrFilters.push({
          attributes: {
            path: ['totalQuantity'],
            gte: filters.quantityMin,
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
          gte: listing.price.toNumber() * 0.5,
          lte: listing.price.toNumber() * 1.5,
        },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: RELATED_SELECT,
    });
  }

  async createListing(
    sellerId: string,
    dto: CreateListingDto,
  ): Promise<SellerListingRow> {
    const game = await this.prisma.game.findUnique({
      where: { slug: dto.gameSlug },
    });
    if (!game) throw new NotFoundException(`Game not found: ${dto.gameSlug}`);
    if (!game.isActive) throw new BadRequestException('Game not available');

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { isSeller: true, status: true, kycStatus: true },
    });
    if (!seller) throw new NotFoundException();
    if (seller.status !== 'ACTIVE') {
      throw new BadRequestException('Account not active');
    }
    if (!seller.isSeller) {
      throw new BadRequestException('Seller mode not activated');
    }
    // RES-HIGH-041: KYC gate — require at least submitted/in-review before first listing
    if (!['VERIFIED', 'SUBMITTED', 'IN_REVIEW', 'PENDING'].includes(seller.kycStatus)) {
      throw new BadRequestException(
        'Identity verification required before listing. Complete KYC from your profile.',
      );
    }

    // RES-MED-052: active listing cap — prevent single account from spamming unlimited listings
    const activeCount = await this.prisma.productListing.count({
      where: { sellerId, status: { in: ['ACTIVE', 'PENDING_REVIEW'] }, deletedAt: null },
    });
    if (activeCount >= 50) {
      throw new BadRequestException(
        'Active listing limit reached (50). Remove or pause existing listings to create new ones.',
      );
    }

    const tabPrefix =
      dto.tabType === 'ACCOUNTS'
        ? 'ACC'
        : dto.tabType === 'TOP_UPS'
          ? 'TOP'
          : 'ITM';
    const gamePrefix = game.slug.toUpperCase().replace(/-/g, '').slice(0, 3);
    // RES-HIGH-005: count+1 SKU races under concurrent creates → P2002.
    // Random hex suffix makes collisions astronomically unlikely.
    const sku = `GTX-${gamePrefix}-${tabPrefix}-${randomBytes(4).toString('hex').toUpperCase()}`;

    const baseSlug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    /* Slug is generated as `<baseSlug>-<randomSuffix>` from the second
       attempt onward. The random suffix means two concurrent inserts of
       the same title don't collide on the same `-2` — they pick
       independent suffixes. The actual P2002 still gets caught below in
       the create call as a final safety net. */
    let slug = baseSlug;
    const randomSuffix = () => randomBytes(3).toString('hex'); // 6 hex chars
    if (await this.prisma.productListing.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${randomSuffix()}`;
    }

    /* Detect "first listing" before insert so we know whether to award
       the EARNED_FIRST_LISTING bonus. We award on first ACTIVE listing
       (DRAFT alone doesn't qualify) — `publish === true` guards this. */
    const existingPublished = await this.prisma.productListing.count({
      where: { sellerId, status: 'ACTIVE' },
    });
    const isFirstPublishedListing = dto.publish && existingPublished === 0;

    /* Up to 3 retries on slug collision — first uses baseSlug or
       baseSlug-<rand>, retries re-roll the random suffix. */
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const created = await tx.productListing.create({
            data: {
              sku,
              slug,
              sellerId,
              gameId: game.id,
              tabType: dto.tabType,
              productType: dto.productType,
              title: dto.title,
              description: dto.description,
              price: dto.price,
              currency: dto.currency,
              originalPrice: dto.originalPrice,
              discountPercent: dto.originalPrice
                ? Math.round(
                    ((dto.originalPrice - dto.price) / dto.originalPrice) * 100,
                  )
                : null,
              stock: dto.stock,
              images: dto.images,
              videoUrl: dto.videoUrl,
              attributes: dto.attributes as Prisma.InputJsonValue,
              deliveryType: dto.deliveryType,
              deliveryTime: dto.deliveryTime,
              searchTags: dto.searchTags,
              status: dto.publish ? 'ACTIVE' : 'DRAFT',
            },
          });

          if (dto.publish) {
            await tx.game.update({
              where: { id: game.id },
              data: { totalListings: { increment: 1 } },
            });
          }

          if (isFirstPublishedListing) {
            await this.loyalty.earn(tx, {
              userId: sellerId,
              type: 'EARNED_FIRST_LISTING',
              points: 50,
              description: 'First listing published — welcome bonus',
            });
          }

          return created;
        });
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? (err as { code?: unknown }).code
            : undefined;
        if (code === 'P2002') {
          slug = `${baseSlug}-${randomSuffix()}`;
          continue;
        }
        throw err;
      }
    }

    throw new ConflictException(
      'Could not allocate a unique slug after multiple attempts — retry.',
    );
  }

  async updateListing(
    sellerId: string,
    listingId: string,
    dto: UpdateListingDto,
  ): Promise<SellerListingRow> {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException();
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Not your listing');
    }
    if (listing.deletedAt) {
      throw new BadRequestException('Listing deleted');
    }

    // RES-HIGH-025: block core-field edits when any order is in-flight —
    // seller could rewrite listing post-sale to escape "not as described" disputes
    const coreFieldsChanging =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.price !== undefined ||
      dto.attributes !== undefined ||
      dto.images !== undefined;
    if (coreFieldsChanging) {
      const inFlight = await this.prisma.order.count({
        where: {
          productListingId: listingId,
          status: { in: ['PENDING', 'PAID', 'IN_PROGRESS', 'DELIVERED'] },
        },
      });
      if (inFlight > 0) {
        throw new BadRequestException(
          'Cannot edit listing core fields while orders are in progress. Wait for active orders to complete.',
        );
      }
    }

    const data: Prisma.ProductListingUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.originalPrice !== undefined) {
      data.originalPrice = dto.originalPrice;
      const finalPrice = dto.price ?? listing.price.toNumber();
      if (dto.originalPrice && finalPrice) {
        data.discountPercent = Math.round(
          ((dto.originalPrice - finalPrice) / dto.originalPrice) * 100,
        );
      }
    }
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl;
    if (dto.attributes !== undefined) {
      data.attributes = dto.attributes as Prisma.InputJsonValue;
    }
    if (dto.deliveryType !== undefined) data.deliveryType = dto.deliveryType;
    if (dto.deliveryTime !== undefined) data.deliveryTime = dto.deliveryTime;
    if (dto.searchTags !== undefined) data.searchTags = dto.searchTags;
    if (dto.publish !== undefined) {
      data.status = dto.publish ? 'ACTIVE' : 'PAUSED';
    }

    return this.prisma.productListing.update({
      where: { id: listingId },
      data,
    });
  }

  async deleteListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException();
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Not your listing');
    }

    const wasActive = listing.status === 'ACTIVE' && !listing.deletedAt;

    await this.prisma.productListing.update({
      where: { id: listingId },
      data: {
        deletedAt: new Date(),
        status: 'REMOVED',
      },
    });

    if (wasActive) {
      await this.prisma.game.update({
        where: { id: listing.gameId },
        data: { totalListings: { decrement: 1 } },
      });
    }

    return { success: true };
  }

  // DB-032: cursor pagination — avoids O(offset) scans on large seller catalogues.
  // Uses (createdAt DESC, id DESC) ordering backed by the compound index added in
  // migration 20260529000004. Cursor is the last item's id; client passes it as
  // ?cursor= on subsequent pages.
  async getMyListings(
    sellerId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{ data: MyListingItem[]; nextCursor: string | null }> {
    const take = Math.min(limit, 50);
    const items = await this.prisma.productListing.findMany({
      where: { sellerId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: MY_LIST_SELECT,
    });
    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? data[data.length - 1].id : null;
    return { data, nextCursor };
  }

  async getMyListing(sellerId: string, id: string): Promise<MyListingDetail> {
    const listing = await this.prisma.productListing.findUnique({
      where: { id },
      include: { game: true },
    });
    if (!listing) throw new NotFoundException();
    if (listing.sellerId !== sellerId) throw new ForbiddenException();
    return listing;
  }
}
