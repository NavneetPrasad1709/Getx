import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import {
  HideContentDto,
  ListAuditLogsDto,
  ListListingsDto,
  ListOrdersDto,
  ListReviewsDto,
  ListUsersDto,
  RefundOrderDto,
  UserActionDto,
} from './dto/admin.dto';

const USERS_LIST_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  country: true,
  role: true,
  status: true,
  isSeller: true,
  kycLevel: true,
  sellerRating: true,
  totalSales: true,
  totalReviews: true,
  sellerWallet: true,
  createdAt: true,
  lastLoginAt: true,
  emailVerified: true,
} satisfies Prisma.UserSelect;

/* Explicit allow-list of User fields safe to surface in the admin
   detail view. Sensitive columns (password, twoFactorSecret,
   aadhaarHash, panHash, sumsubExternalUserId, ...) are deliberately
   omitted so a compromised admin session cannot exfiltrate credentials
   or PII hashes. Add fields here only after confirming they're safe
   to ship to the admin UI. */
const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  displayName: true,
  avatar: true,
  bio: true,
  country: true,
  preferredCurrency: true,
  role: true,
  status: true,
  isSeller: true,
  sellerActivatedAt: true,
  sellerRating: true,
  buyerRating: true,
  totalSales: true,
  totalReviews: true,
  verifiedTier: true,
  rank: true,
  xp: true,
  kycLevel: true,
  kycStatus: true,
  kycProvider: true,
  kycSubmittedAt: true,
  kycVerifiedAt: true,
  kycRejectionReason: true,
  emailVerified: true,
  phoneVerified: true,
  marketingOptIn: true,
  loyaltyPoints: true,
  lifetimeLoyaltyPoints: true,
  buyerWallet: true,
  sellerWallet: true,
  pendingEarnings: true,
  totalEarned: true,
  banReason: true,
  bannedAt: true,
  bannedBy: true,
  suspendedUntil: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      buyerOrders: true,
      sellerOrders: true,
      productListings: true,
      customRequests: true,
      sellerOffers: true,
    },
  },
} satisfies Prisma.UserSelect;

/* Parties on an order — never include `buyer: true` / `seller: true`
   because Prisma's default include returns every User column. */
const ORDER_PARTY_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
  country: true,
  isSeller: true,
  status: true,
  sellerRating: true,
  buyerRating: true,
  totalSales: true,
} satisfies Prisma.UserSelect;

const ORDER_LIST_INCLUDE = {
  buyer: { select: { id: true, username: true, name: true, email: true } },
  seller: { select: { id: true, username: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

const ORDER_DETAIL_INCLUDE = {
  buyer: { select: ORDER_PARTY_SELECT },
  seller: { select: ORDER_PARTY_SELECT },
  productListing: true,
  customRequest: true,
  payouts: true,
  reviews: {
    include: {
      author: { select: { id: true, username: true, name: true } },
    },
  },
} satisfies Prisma.OrderInclude;

const LISTING_LIST_INCLUDE = {
  seller: {
    select: { id: true, username: true, name: true, status: true, email: true },
  },
  game: { select: { name: true, slug: true } },
} satisfies Prisma.ProductListingInclude;

const REVIEW_LIST_INCLUDE = {
  author: { select: { id: true, username: true, name: true } },
  target: { select: { id: true, username: true, name: true } },
  order: { select: { id: true, orderNumber: true } },
} satisfies Prisma.ReviewInclude;

export type AdminUserList = Prisma.UserGetPayload<{
  select: typeof USERS_LIST_SELECT;
}>;
export type AdminUserDetail = Prisma.UserGetPayload<{
  select: typeof USER_DETAIL_SELECT;
}>;
export type AdminOrderListItem = Prisma.OrderGetPayload<{
  include: typeof ORDER_LIST_INCLUDE;
}>;
export type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: typeof ORDER_DETAIL_INCLUDE;
}>;
export type AdminListing = Prisma.ProductListingGetPayload<{
  include: typeof LISTING_LIST_INCLUDE;
}>;
export type AdminReview = Prisma.ReviewGetPayload<{
  include: typeof REVIEW_LIST_INCLUDE;
}>;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private payments: PaymentsService,
    private notifications: NotificationsService,
  ) {}

  async getDashboard() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const PAID_LIKE: Prisma.OrderWhereInput['status'] = {
      in: ['PAID', 'IN_PROGRESS', 'DELIVERED', 'CONFIRMED', 'COMPLETED'],
    };

    // Batched in groups of 3 to avoid hammering the Prisma connection pool.
    // Pre-launch audit found a single Promise.all of 14 queries was tripping
    // the P2024 timeout under PgBouncer's `connection_limit=1`. Even now that
    // we've raised the limit (.env), keeping these batched protects against
    // any future re-tightening and shaves ~30% off worst-case latency.
    const [totalUsers, newUsersWeek, activeSellers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: weekAgo }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { isSeller: true, status: 'ACTIVE' },
      }),
    ]);

    const [totalListings, activeListings] = await Promise.all([
      this.prisma.productListing.count({ where: { deletedAt: null } }),
      this.prisma.productListing.count({
        where: { status: 'ACTIVE', deletedAt: null },
      }),
    ]);

    const [totalOrders, ordersWeek] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    const [gmvAllTime, gmvWeek] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { buyerTotal: true },
        where: { status: PAID_LIKE },
      }),
      this.prisma.order.aggregate({
        _sum: { buyerTotal: true },
        where: { status: PAID_LIKE, createdAt: { gte: weekAgo } },
      }),
    ]);

    const [revenueAllTime, revenueWeek] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { buyerFee: true, sellerCommission: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.order.aggregate({
        _sum: { buyerFee: true, sellerCommission: true },
        where: { status: 'COMPLETED', createdAt: { gte: weekAgo } },
      }),
    ]);

    const [pendingPayouts, totalReviews, recentAudits] = await Promise.all([
      this.prisma.user.aggregate({ _sum: { sellerWallet: true } }),
      this.prisma.review.count({ where: { isHidden: false } }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          userId: true,
          entity: true,
          entityId: true,
          severity: true,
          createdAt: true,
        },
      }),
    ]);

    const revWeek =
      (revenueWeek._sum.buyerFee ?? 0) +
      (revenueWeek._sum.sellerCommission ?? 0);
    const revAll =
      (revenueAllTime._sum.buyerFee ?? 0) +
      (revenueAllTime._sum.sellerCommission ?? 0);

    return {
      users: { total: totalUsers, newThisWeek: newUsersWeek, activeSellers },
      listings: { total: totalListings, active: activeListings },
      orders: { total: totalOrders, thisWeek: ordersWeek },
      gmv: {
        allTime: gmvAllTime._sum.buyerTotal ?? 0,
        thisWeek: gmvWeek._sum.buyerTotal ?? 0,
      },
      revenue: { allTime: revAll, thisWeek: revWeek },
      pendingPayouts: pendingPayouts._sum.sellerWallet ?? 0,
      totalReviews,
      recentAudits,
    };
  }

  async listUsers(dto: ListUsersDto) {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { username: { contains: dto.search, mode: 'insensitive' } },
        { name: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.status) where.status = dto.status;
    if (dto.role) where.role = dto.role;
    if (dto.isSeller !== undefined) where.isSeller = dto.isSeller;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: USERS_LIST_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      },
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_DETAIL_SELECT,
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  async banUser(adminId: string, userId: string, dto: UserActionDto) {
    if (adminId === userId) {
      throw new BadRequestException('Cannot ban yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot ban another admin');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'BANNED',
          banReason: dto.reason,
          bannedAt: new Date(),
          bannedBy: adminId,
        },
      });

      await tx.productListing.updateMany({
        where: { sellerId: userId, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });

      await tx.session.deleteMany({ where: { userId } });
      await tx.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.user_banned',
      entity: 'User',
      entityId: userId,
      metadata: { reason: dto.reason, targetEmail: target.email },
      severity: 'CRITICAL',
    });

    return { success: true };
  }

  async unbanUser(adminId: string, userId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!target) throw new NotFoundException();

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', banReason: null },
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.user_unbanned',
      entity: 'User',
      entityId: userId,
      metadata: { targetEmail: target.email },
      severity: 'WARNING',
    });

    return { success: true };
  }

  async listOrders(dto: ListOrdersDto) {
    const where: Prisma.OrderWhereInput = {};
    if (dto.status) where.status = dto.status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: ORDER_LIST_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      },
    };
  }

  async getOrderDetail(orderId: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException();
    return order;
  }

  /**
   * Force-release escrow to seller — equivalent to confirmReceipt but
   * triggered by an admin (e.g. dispute resolution in seller's favour).
   */
  async forceReleaseEscrow(
    adminId: string,
    orderId: string,
    dto: UserActionDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        buyerId: true,
        sellerId: true,
        escrowStatus: true,
        sellerAmount: true,
        currency: true,
      },
    });
    if (!order) throw new NotFoundException();
    if (order.escrowStatus !== 'HELD') {
      throw new BadRequestException(
        `Cannot release: escrow status is ${order.escrowStatus}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const seller = await tx.user.findUnique({
        where: { id: order.sellerId },
        select: { sellerWallet: true },
      });
      if (!seller) throw new NotFoundException('Seller not found');

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          escrowStatus: 'RELEASED',
          confirmedAt: new Date(),
        },
      });

      const newWallet = seller.sellerWallet + order.sellerAmount;
      await tx.user.update({
        where: { id: order.sellerId },
        data: {
          sellerWallet: { increment: order.sellerAmount },
          totalEarned: { increment: order.sellerAmount },
          totalSales: { increment: 1 },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: order.sellerId,
          type: 'ORDER_RELEASED',
          amount: order.sellerAmount,
          currency: order.currency,
          orderId: order.id,
          balanceBefore: seller.sellerWallet,
          balanceAfter: newWallet,
          description: `Admin force-release for order ${order.orderNumber}: ${dto.reason}`,
          metadata: { trigger: 'admin', adminId, reason: dto.reason },
        },
      });
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.escrow_force_released',
      entity: 'Order',
      entityId: orderId,
      metadata: {
        reason: dto.reason,
        orderNumber: order.orderNumber,
        amount: order.sellerAmount,
      },
      severity: 'CRITICAL',
    });

    // Mirror the user-visible side of confirmReceipt: tell the seller they
    // got paid, tell the buyer their order is now closed.
    void this.notifications.create({
      userId: order.sellerId,
      type: 'ORDER_COMPLETED',
      title: 'Order completed — payment released',
      message: `Order ${order.orderNumber} confirmed by GETX admin. $${order.sellerAmount.toFixed(2)} added to your wallet.`,
      link: `/orders/${order.id}`,
      metadata: {
        entityType: 'Order',
        entityId: order.id,
        amount: order.sellerAmount,
        adminAction: 'force_release',
      },
      sendEmail: true,
    });

    void this.notifications.create({
      userId: order.buyerId,
      type: 'ORDER_COMPLETED',
      title: 'Order completed',
      message: `Your order ${order.orderNumber} has been completed by GETX admin review.`,
      link: `/orders/${order.id}`,
      metadata: {
        entityType: 'Order',
        entityId: order.id,
        adminAction: 'force_release',
      },
      sendEmail: false, // In-app only — admin-involvement messaging is sensitive.
    });

    return { success: true };
  }

  async refundOrder(adminId: string, orderId: string, dto: RefundOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        buyerId: true,
        sellerId: true,
        buyerTotal: true,
        paymentTransactionId: true,
        paymentProvider: true,
      },
    });
    if (!order) throw new NotFoundException();
    if (
      !(['PAID', 'IN_PROGRESS', 'DELIVERED'] as const).includes(
        order.status as 'PAID' | 'IN_PROGRESS' | 'DELIVERED',
      )
    ) {
      throw new BadRequestException(
        `Cannot refund order in ${order.status} state`,
      );
    }
    if (!order.paymentTransactionId) {
      throw new BadRequestException('No payment transaction recorded');
    }

    let refundId: string | null = null;
    try {
      const result = await this.payments.processRefund({
        transactionId: order.paymentTransactionId,
        amount: dto.fullRefund
          ? undefined
          : Math.round((dto.amount ?? order.buyerTotal) * 100),
        reason: dto.reason,
      });
      refundId = result.refundId;
    } catch (err) {
      this.logger.warn(
        `Provider refund failed for ${orderId}: ${err instanceof Error ? err.message : err}`,
      );
      throw new BadRequestException(
        'Provider refund failed; order not updated',
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        escrowStatus: 'REFUNDED',
        refundedAt: new Date(),
        refundReason: dto.reason,
        refundAmount: dto.fullRefund
          ? order.buyerTotal
          : (dto.amount ?? order.buyerTotal),
        refundTransactionId: refundId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.order_refunded',
      entity: 'Order',
      entityId: orderId,
      metadata: {
        reason: dto.reason,
        amount: dto.amount,
        full: dto.fullRefund,
        refundId,
      },
      severity: 'CRITICAL',
    });

    const refundedAmount = dto.fullRefund
      ? order.buyerTotal
      : (dto.amount ?? order.buyerTotal);

    // Use ORDER_CANCELLED enum value — NotificationType doesn't have a
    // dedicated ORDER_REFUNDED. Cancellation semantically captures "order
    // ended unexpectedly with money returned to the buyer".
    void this.notifications.create({
      userId: order.buyerId,
      type: 'ORDER_CANCELLED',
      title: 'Refund processed',
      message: `$${refundedAmount.toFixed(2)} has been refunded to your original payment method for order ${order.orderNumber}.`,
      link: `/orders/${order.id}`,
      metadata: {
        entityType: 'Order',
        entityId: order.id,
        amount: refundedAmount,
        adminAction: 'refund',
      },
      sendEmail: true,
    });

    void this.notifications.create({
      userId: order.sellerId,
      type: 'ORDER_CANCELLED',
      title: 'Order refunded by admin',
      message: `Order ${order.orderNumber} was refunded. Reason: ${dto.reason}`,
      link: `/orders/${order.id}`,
      metadata: {
        entityType: 'Order',
        entityId: order.id,
        amount: refundedAmount,
        adminAction: 'refund',
      },
      sendEmail: true,
    });

    return { success: true, refundId };
  }

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
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      },
    };
  }

  /**
   * Hide a listing by setting status=REMOVED. Public + seller queries both
   * filter REMOVED out. Reversible by admin via unhideListing → ACTIVE.
   */
  async hideListing(adminId: string, listingId: string, dto: HideContentDto) {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true, sku: true },
    });
    if (!listing) throw new NotFoundException();
    if (listing.status === 'REMOVED') {
      throw new BadRequestException('Listing already hidden/removed');
    }

    await this.prisma.productListing.update({
      where: { id: listingId },
      data: { status: 'REMOVED' },
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.listing_hidden',
      entity: 'ProductListing',
      entityId: listingId,
      metadata: {
        reason: dto.reason,
        sku: listing.sku,
        sellerId: listing.sellerId,
      },
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
      userId: adminId,
      action: 'admin.listing_unhidden',
      entity: 'ProductListing',
      entityId: listingId,
      metadata: { sku: listing.sku },
      severity: 'INFO',
    });

    return { success: true };
  }

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
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      },
    };
  }

  async hideReview(adminId: string, reviewId: string, dto: HideContentDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        targetId: true,
        direction: true,
        isHidden: true,
        flagReasons: true,
      },
    });
    if (!review) throw new NotFoundException();
    if (review.isHidden) {
      throw new BadRequestException('Review already hidden');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          isHidden: true,
          // Reason stored in flagReasons (Review has no hiddenReason column).
          flagReasons: [...review.flagReasons, `admin: ${dto.reason}`],
        },
      });

      // Recompute target's aggregate after hiding.
      const stats = await tx.review.aggregate({
        where: {
          targetId: review.targetId,
          isHidden: false,
          direction: review.direction,
        },
        _avg: { rating: true },
        _count: true,
      });

      if (review.direction === 'BUYER_REVIEWS_SELLER') {
        await tx.user.update({
          where: { id: review.targetId },
          data: {
            sellerRating: stats._avg.rating ?? 0,
            totalReviews: stats._count,
          },
        });
      } else {
        await tx.user.update({
          where: { id: review.targetId },
          data: { buyerRating: stats._avg.rating ?? 0 },
        });
      }
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.review_hidden',
      entity: 'Review',
      entityId: reviewId,
      metadata: { reason: dto.reason },
      severity: 'WARNING',
    });

    return { success: true };
  }

  async listAuditLogs(dto: ListAuditLogsDto): Promise<{
    data: Prisma.AuditLogGetPayload<object>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
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
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      },
    };
  }
}
