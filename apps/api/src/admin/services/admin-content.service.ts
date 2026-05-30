import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  HideContentDto,
  ListAuditLogsDto,
  ListListingsDto,
  ListReviewsDto,
} from '../dto/admin.dto';

const LISTING_LIST_INCLUDE = {
  seller: { select: { id: true, username: true, name: true, status: true, email: true } },
  game: { select: { name: true, slug: true } },
} satisfies Prisma.ProductListingInclude;

const REVIEW_LIST_INCLUDE = {
  author: { select: { id: true, username: true, name: true } },
  target: { select: { id: true, username: true, name: true } },
  order: { select: { id: true, orderNumber: true } },
} satisfies Prisma.ReviewInclude;

export type AdminListing = Prisma.ProductListingGetPayload<{ include: typeof LISTING_LIST_INCLUDE }>;
export type AdminReview = Prisma.ReviewGetPayload<{ include: typeof REVIEW_LIST_INCLUDE }>;

@Injectable()
export class AdminContentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Listings ─────────────────────────────────────────────────────────────

  async listListings(dto: ListListingsDto) {
    const where: Prisma.ProductListingWhereInput = {};
    if (dto.status) where.status = dto.status;

    const [data, total] = await Promise.all([
      this.prisma.productListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: LISTING_LIST_INCLUDE,
      }),
      this.prisma.productListing.count({ where }),
    ]);

    return {
      data,
      pagination: { page: dto.page, limit: dto.limit, total, totalPages: Math.max(1, Math.ceil(total / dto.limit)) },
    };
  }

  async hideListing(adminId: string, listingId: string, dto: HideContentDto) {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true, sku: true },
    });
    if (!listing) throw new NotFoundException();
    if (listing.status === 'REMOVED') throw new BadRequestException('Listing already hidden/removed');

    await this.prisma.productListing.update({
      where: { id: listingId },
      data: { status: 'REMOVED' },
    });

    await this.audit.log({
      userId: adminId, action: 'admin.listing_hidden', entity: 'ProductListing', entityId: listingId,
      metadata: { reason: dto.reason, sku: listing.sku, sellerId: listing.sellerId },
      severity: 'WARNING',
    });

    return { success: true };
  }

  async unhideListing(adminId: string, listingId: string) {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
      select: { id: true, sku: true },
    });
    if (!listing) throw new NotFoundException();

    await this.prisma.productListing.update({
      where: { id: listingId },
      data: { status: 'ACTIVE', deletedAt: null },
    });

    await this.audit.log({
      userId: adminId, action: 'admin.listing_unhidden', entity: 'ProductListing', entityId: listingId,
      metadata: { sku: listing.sku }, severity: 'INFO',
    });

    return { success: true };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  async listReviews(dto: ListReviewsDto) {
    const where: Prisma.ReviewWhereInput = { isHidden: dto.hidden };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: REVIEW_LIST_INCLUDE,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      pagination: { page: dto.page, limit: dto.limit, total, totalPages: Math.max(1, Math.ceil(total / dto.limit)) },
    };
  }

  async hideReview(adminId: string, reviewId: string, dto: HideContentDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, targetId: true, direction: true, isHidden: true, flagReasons: true },
    });
    if (!review) throw new NotFoundException();
    if (review.isHidden) throw new BadRequestException('Review already hidden');

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { isHidden: true, flagReasons: [...review.flagReasons, `admin: ${dto.reason}`] },
      });

      const stats = await tx.review.aggregate({
        where: { targetId: review.targetId, isHidden: false, direction: review.direction },
        _avg: { rating: true },
        _count: true,
      });

      if (review.direction === 'BUYER_REVIEWS_SELLER') {
        await tx.user.update({
          where: { id: review.targetId },
          data: { sellerRating: stats._avg.rating ?? 0, totalReviews: stats._count },
        });
      } else {
        await tx.user.update({
          where: { id: review.targetId },
          data: { buyerRating: stats._avg.rating ?? 0 },
        });
      }
    });

    await this.audit.log({
      userId: adminId, action: 'admin.review_hidden', entity: 'Review', entityId: reviewId,
      metadata: { reason: dto.reason }, severity: 'WARNING',
    });

    return { success: true };
  }

  // ── Audit logs ────────────────────────────────────────────────────────────

  async listAuditLogs(dto: ListAuditLogsDto): Promise<{
    data: Prisma.AuditLogGetPayload<object>[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.AuditLogWhereInput = {};
    if (dto.userId) where.userId = dto.userId;
    if (dto.action) where.action = { contains: dto.action };
    if (dto.severity) where.severity = dto.severity;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (dto.page - 1) * dto.limit, take: dto.limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: { page: dto.page, limit: dto.limit, total, totalPages: Math.max(1, Math.ceil(total / dto.limit)) },
    };
  }
}
