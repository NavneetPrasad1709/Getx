import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ReviewDirection } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto, RespondToReviewDto } from './dto/create-review.dto';

const PUBLIC_REVIEW_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      country: true,
    },
  },
  order: {
    select: { id: true, orderNumber: true, productListingId: true },
  },
} satisfies Prisma.ReviewInclude;

export type PublicReview = Prisma.ReviewGetPayload<{
  include: typeof PUBLIC_REVIEW_INCLUDE;
}>;

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        orderNumber: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('Order must be completed before reviewing');
    }

    let direction: ReviewDirection;
    let targetId: string;
    if (order.buyerId === userId) {
      direction = 'BUYER_REVIEWS_SELLER';
      targetId = order.sellerId;
    } else if (order.sellerId === userId) {
      direction = 'SELLER_REVIEWS_BUYER';
      targetId = order.buyerId;
    } else {
      throw new ForbiddenException('Not your order');
    }

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            orderId: dto.orderId,
            authorId: userId,
            targetId,
            direction,
            rating: dto.rating,
            title: dto.title,
            comment: dto.content,
            images: dto.images,
          },
        });

        // Recompute target's aggregate rating for this direction.
        const stats = await tx.review.aggregate({
          where: { targetId, direction, isHidden: false },
          _avg: { rating: true },
          _count: true,
        });
        const avg = stats._avg.rating ?? 0;
        const count = stats._count;

        if (direction === 'BUYER_REVIEWS_SELLER') {
          await tx.user.update({
            where: { id: targetId },
            data: { sellerRating: avg, totalReviews: count },
          });
        } else {
          await tx.user.update({
            where: { id: targetId },
            data: { buyerRating: avg },
          });
        }

        return created;
      });

      await this.audit.log({
        userId,
        action: 'review.created',
        entity: 'Review',
        entityId: review.id,
        metadata: {
          rating: dto.rating,
          orderId: dto.orderId,
          direction,
        },
      });

      // Best-effort notification — never fail the review on notif errors.
      void this.notifications.create({
        userId: targetId,
        type: 'NEW_REVIEW',
        title: 'New review received',
        message: `You received a ${dto.rating}-star review on order ${order.orderNumber}.`,
        link: `/users/me/reviews`,
        metadata: { reviewId: review.id, rating: dto.rating, direction },
        sendEmail: true,
      });

      return review;
    } catch (err) {
      // Prisma unique constraint on (orderId, authorId)
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('You already reviewed this order');
      }
      throw err;
    }
  }

  async respondToReview(
    userId: string,
    reviewId: string,
    dto: RespondToReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, targetId: true, response: true },
    });
    if (!review) throw new NotFoundException();
    if (review.targetId !== userId) {
      throw new ForbiddenException('Only the reviewee can respond');
    }
    if (review.response) {
      throw new BadRequestException('Response already exists');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        response: dto.responseText,
        respondedAt: new Date(),
      },
    });
  }

  async getReviewsForUser(
    targetId: string,
    direction: ReviewDirection = 'BUYER_REVIEWS_SELLER',
    page = 1,
    limit = 20,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const where: Prisma.ReviewWhereInput = {
      targetId,
      direction,
      isHidden: false,
    };

    const [data, total, distRows] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: PUBLIC_REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: true,
      }),
    ]);

    const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows) {
      const r = row.rating as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) distribution[r] = row._count;
    }

    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
      distribution,
    };
  }

  async canReviewOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        reviews: {
          where: { authorId: userId },
          select: { id: true, direction: true },
        },
      },
    });
    if (!order) return { canReview: false, reason: 'Order not found' as const };
    if (order.status !== 'COMPLETED') {
      return { canReview: false, reason: 'Order not completed' as const };
    }
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return { canReview: false, reason: 'Not your order' as const };
    }
    if (order.reviews.length > 0) {
      return { canReview: false, reason: 'Already reviewed' as const };
    }
    const direction: ReviewDirection =
      order.buyerId === userId
        ? 'BUYER_REVIEWS_SELLER'
        : 'SELLER_REVIEWS_BUYER';
    return { canReview: true, direction };
  }
}
