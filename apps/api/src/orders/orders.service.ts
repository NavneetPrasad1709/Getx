import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatGateway } from '../conversations/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { RankService } from '../rank/rank.service';
import {
  CreateOrderFromListingDto,
  CreateOrderFromOfferDto,
  MarkDeliveredDto,
} from './dto/create-order.dto';

const BUYER_FEE_PCT = 0.08;
/* Default seller commission. Per-rank tiers (TRUSTED 9%, PRO 8%,
   ELITE 7%, LEGEND 6%) come from RankService.sellerCommissionRateFor
   and are resolved per order at creation. */
const SELLER_COMMISSION_PCT = 0.1;

const DETAIL_INCLUDE = {
  buyer: {
    select: { id: true, name: true, username: true, avatar: true, email: true },
  },
  seller: {
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      sellerRating: true,
      verifiedTier: true,
      rank: true,
    },
  },
  productListing: {
    select: { id: true, slug: true, sku: true, title: true, images: true, status: true, deletedAt: true },
  },
  customRequest: {
    select: { id: true, requestNumber: true, title: true, tabType: true },
  },
  /* Latest dispute (highest-priority open one first, then most recent
     resolved). Used by the order page to flip the "Open dispute" button
     to "View dispute" when one is already active. */
  disputes: {
    select: {
      id: true,
      disputeNumber: true,
      reason: true,
      status: true,
      priority: true,
      resolution: true,
      createdAt: true,
      resolvedAt: true,
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 1,
  },
} satisfies Prisma.OrderInclude;

const LIST_INCLUDE = {
  buyer: { select: { id: true, name: true, username: true } },
  seller: { select: { id: true, name: true, username: true } },
  productListing: { select: { slug: true, images: true } },
  customRequest: { select: { requestNumber: true, title: true } },
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;
export type OrderListItem = Prisma.OrderGetPayload<{
  include: typeof LIST_INCLUDE;
}>;
export type OrderRow = Prisma.OrderGetPayload<object>;

interface CreateOrderParams {
  buyerId: string;
  sellerId: string;
  listingId: string | null;
  customRequestId: string | null;
  offerId: string | null;
  basePrice: number;
  quantity: number;
  currency: string;
  snapshotTitle: string;
  snapshot: Prisma.InputJsonValue;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private conversations: ConversationsService,
    private chat: ChatGateway,
    private notifications: NotificationsService,
    private wallet: WalletService,
    private loyalty: LoyaltyService,
    private rank: RankService,
  ) {}

  private async emitSystemMessage(params: {
    orderId: string;
    event: string;
    content: string;
  }) {
    try {
      const msg = await this.conversations.sendSystemMessage(params);
      if (msg) {
        this.chat.broadcastToConversation(
          msg.conversationId,
          'message_received',
          msg,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to emit ${params.event} for order ${params.orderId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async createFromListing(
    buyerId: string,
    dto: CreateOrderFromListingDto,
  ): Promise<OrderRow> {
    const listing = await this.prisma.productListing.findUnique({
      where: { id: dto.listingId },
    });

    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.deletedAt) throw new BadRequestException('Listing removed');
    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException('Listing not available');
    }
    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot buy your own listing');
    }
    if (listing.stock !== -1 && listing.stock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.createOrder({
      buyerId,
      sellerId: listing.sellerId,
      listingId: listing.id,
      customRequestId: null,
      offerId: null,
      basePrice: listing.price,
      quantity: dto.quantity,
      currency: listing.currency,
      snapshotTitle: listing.title,
      snapshot: {
        kind: 'listing',
        title: listing.title,
        sku: listing.sku,
        price: listing.price,
        attributes: listing.attributes as Prisma.InputJsonValue,
        images: listing.images,
      },
    });
  }

  async createFromOffer(
    buyerId: string,
    dto: CreateOrderFromOfferDto,
  ): Promise<OrderRow> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: dto.offerId },
      include: { request: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.buyerId !== buyerId) {
      throw new ForbiddenException('Not your request');
    }
    if (offer.status !== 'PENDING') {
      throw new BadRequestException('Offer not available');
    }
    if (offer.request.status !== 'OPEN') {
      throw new BadRequestException('Request no longer accepting offers');
    }

    return this.createOrder({
      buyerId,
      sellerId: offer.sellerId,
      listingId: null,
      customRequestId: offer.requestId,
      offerId: offer.id,
      basePrice: offer.price,
      quantity: 1,
      currency: offer.currency,
      snapshotTitle: offer.request.title,
      snapshot: {
        kind: 'offer',
        requestNumber: offer.request.requestNumber,
        title: offer.request.title,
        offerPrice: offer.price,
        deliveryHours: offer.deliveryHours,
        message: offer.message,
        attributes: offer.request.attributes as Prisma.InputJsonValue,
      },
    });
  }

  private async createOrder(params: CreateOrderParams): Promise<OrderRow> {
    const amount = round2(params.basePrice * params.quantity);
    const buyerFee = round2(amount * BUYER_FEE_PCT);
    const buyerTotal = round2(amount + buyerFee);

    /* Resolve the seller's commission rate from their current rank.
       Fallback to the default 10% if the seller row is missing for some
       reason — never zero, never throws. */
    const sellerRankRow = await this.prisma.user.findUnique({
      where: { id: params.sellerId },
      select: { rank: true },
    });
    const commissionRate = sellerRankRow
      ? RankService.sellerCommissionRateFor(sellerRankRow.rank)
      : SELLER_COMMISSION_PCT;
    const sellerCommission = round2(amount * commissionRate);
    const sellerAmount = round2(amount - sellerCommission);

    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
      where: { orderNumber: { startsWith: `ORD-${year}-` } },
    });
    const orderNumber = `ORD-${year}-${String(count + 1).padStart(6, '0')}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        productListingId: params.listingId,
        customRequestId: params.customRequestId,
        offerId: params.offerId,
        amount,
        buyerFee,
        buyerTotal,
        sellerCommission,
        sellerAmount,
        currency: params.currency,
        status: 'PENDING',
        escrowStatus: 'PENDING',
        paymentMetadata: {
          snapshotTitle: params.snapshotTitle,
          snapshot: params.snapshot,
        },
      },
    });

    await this.audit.log({
      userId: params.buyerId,
      action: 'order.created',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber,
        buyerTotal,
        source: params.listingId ? 'listing' : 'offer',
      },
    });

    return order;
  }

  async markDelivered(
    orderId: string,
    sellerId: string,
    dto: MarkDeliveredDto,
  ): Promise<OrderRow> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException();
    if (order.sellerId !== sellerId) throw new ForbiddenException();
    if (order.status !== 'PAID' && order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot mark delivered. Current status: ${order.status}`,
      );
    }

    const deliveryProof: Prisma.InputJsonValue = {
      images: dto.proofImages,
      notes: dto.notes ?? null,
      credentials: dto.credentials ?? null,
      deliveredAt: new Date().toISOString(),
    };

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryProof,
      },
    });

    await this.audit.log({
      userId: sellerId,
      action: 'order.delivered',
      entity: 'Order',
      entityId: orderId,
      metadata: { orderNumber: order.orderNumber },
    });

    await this.emitSystemMessage({
      orderId,
      event: 'ORDER_DELIVERED',
      content: `Seller marked order ${order.orderNumber} as delivered. Confirm receipt to release escrow.`,
    });

    void this.notifications.create({
      userId: order.buyerId,
      type: 'ORDER_DELIVERED',
      title: 'Your order was delivered',
      message: `Order ${order.orderNumber} delivered. Please confirm receipt to release the seller's payment.`,
      link: `/orders/${order.id}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      sendEmail: true,
    });

    return updated;
  }

  async confirmReceipt(orderId: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException();
    if (order.buyerId !== buyerId) throw new ForbiddenException();
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Order not in DELIVERED state');
    }

    await this.releaseToSeller(order.id, 'manual');

    await this.audit.log({
      userId: buyerId,
      action: 'order.completed',
      entity: 'Order',
      entityId: orderId,
      metadata: { orderNumber: order.orderNumber, manualRelease: true },
      severity: 'WARNING',
    });

    await this.emitSystemMessage({
      orderId,
      event: 'ORDER_COMPLETED',
      content: `Buyer confirmed receipt. Order ${order.orderNumber} completed and funds released.`,
    });

    void this.notifications.create({
      userId: order.sellerId,
      type: 'ORDER_COMPLETED',
      title: 'Order completed — payment released',
      message: `Order ${order.orderNumber} confirmed by buyer. $${order.sellerAmount.toFixed(2)} added to your wallet.`,
      link: `/orders/${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.sellerAmount,
      },
      sendEmail: true,
    });

    return {
      success: true,
      message: 'Receipt confirmed. Seller has been paid.',
    };
  }

  /**
   * Releases escrow to seller's wallet.
   * Used by both manual confirm and the auto-release cron.
   */
  private async releaseToSeller(
    orderId: string,
    trigger: 'manual' | 'auto',
  ): Promise<void> {
    const cashbackResult = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException();
      if (order.escrowStatus !== 'HELD') return { cashback: 0, order: null };

      const seller = await tx.user.findUnique({
        where: { id: order.sellerId },
        select: { sellerWallet: true, totalEarned: true },
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
          description: `Earnings from order ${order.orderNumber}${
            trigger === 'auto' ? ' (auto-released)' : ''
          }`,
          metadata: { trigger },
        },
      });

      /* Buyer cashback — 1% of buyerTotal in same currency as the order.
         Runs in the same tx as the seller release so balances stay in
         sync even under failure. */
      const cashback = await this.wallet.creditCashback(tx, {
        buyerId: order.buyerId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        buyerTotal: order.buyerTotal,
        currency: order.currency,
      });

      /* Loyalty: 1 point per $1 of buyerTotal (capped 1000/order to
         prevent farming via inflated test orders). XP: 10× points,
         capped 1000 per side. Both buyer and seller earn XP. */
      const loyaltyPoints = Math.min(1000, Math.floor(order.buyerTotal));
      if (loyaltyPoints > 0) {
        await this.loyalty.earn(tx, {
          userId: order.buyerId,
          type: 'EARNED_PURCHASE',
          points: loyaltyPoints,
          description: `${loyaltyPoints} pts from order ${order.orderNumber}`,
          orderId: order.id,
        });
      }
      const xpAmount = Math.min(1000, Math.floor(order.buyerTotal) * 10);
      if (xpAmount > 0) {
        await this.rank.earnXp(tx, order.buyerId, xpAmount);
        await this.rank.earnXp(tx, order.sellerId, xpAmount);
      }

      return { cashback, order, loyaltyPoints };
    });

    /* Cashback toast — fire-and-forget outside the tx so the txn commits
       even when the notification queue is unavailable. */
    if (cashbackResult.cashback > 0 && cashbackResult.order) {
      const o = cashbackResult.order;
      void this.notifications.create({
        userId: o.buyerId,
        type: 'ORDER_COMPLETED',
        title: 'GETX Coins earned',
        message: `You earned ₹${cashbackResult.cashback.toFixed(0)} cashback on order ${o.orderNumber}.`,
        link: '/profile/wallet',
        metadata: {
          orderId: o.id,
          cashbackAmount: cashbackResult.cashback,
        },
        sendEmail: false,
      });
    }
  }

  /* Reorder — creates a new PENDING order against the same listingId as a
     completed (or refunded) order. Buyer gets redirected to /orders/<new>
     where they can pay. Hits the same createFromListing pipeline so all
     guards (stock, listing.status, self-purchase) re-apply at current
     listing state. */
  async reorder(
    buyerId: string,
    orderId: string,
  ): Promise<{ orderId: string }> {
    const original = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        productListing: { select: { id: true, status: true, deletedAt: true } },
      },
    });
    if (!original) throw new NotFoundException();
    if (original.buyerId !== buyerId) throw new ForbiddenException();
    if (!original.productListing) {
      throw new BadRequestException('This order has no reorderable listing');
    }
    if (
      original.productListing.deletedAt ||
      original.productListing.status !== 'ACTIVE'
    ) {
      throw new BadRequestException('Listing is no longer available');
    }
    const created = await this.createFromListing(buyerId, {
      listingId: original.productListing.id,
      quantity: 1,
    });
    return { orderId: created.id };
  }

  /* Open a dispute — buyer initiated only (sellers contact support).
     Sets order status to DISPUTED which pauses auto-release (the cron
     filter excludes DISPUTED). Fires WS broadcast + system message in the
     order conversation + email notification to seller. */
  async openDispute(
    buyerId: string,
    orderId: string,
    dto: {
      reason: 'NOT_DELIVERED' | 'WRONG_ITEM' | 'ACCOUNT_RECOVERED' | 'FRAUDULENT' | 'POOR_QUALITY' | 'COMMUNICATION_ISSUE' | 'OTHER';
      description: string;
      evidence: string[];
    },
  ): Promise<{ id: string; disputeNumber: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        buyerId: true,
        sellerId: true,
        status: true,
      },
    });
    if (!order) throw new NotFoundException();
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can open a dispute');
    }
    if (!['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(order.status)) {
      throw new BadRequestException(
        `Disputes are only allowed on paid orders. Current status: ${order.status}`,
      );
    }

    const existing = await this.prisma.dispute.findFirst({
      where: { orderId, status: { in: ['OPEN', 'REVIEWING', 'AWAITING_RESPONSE'] } },
    });
    if (existing) {
      throw new BadRequestException('A dispute is already open on this order');
    }

    /* Sequential dispute number — coarse but unique per process. */
    const seq = await this.prisma.dispute.count();
    const disputeNumber = `DSP-${new Date().getFullYear()}-${String(seq + 1).padStart(5, '0')}`;

    const dispute = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: {
          disputeNumber,
          orderId,
          creatorId: buyerId,
          reason: dto.reason,
          description: dto.description,
          evidence: dto.evidence,
          status: 'OPEN',
          priority: 'NORMAL',
          /* First-response SLA target — internal team responds within 6 hrs
             per the buyer-facing copy in the modal. */
          responseDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'DISPUTED' },
      });
      return d;
    });

    /* Notify seller — high-signal in-app + email. */
    void this.notifications.create({
      userId: order.sellerId,
      type: 'DISPUTE_OPENED',
      title: 'Dispute opened',
      message: `Buyer opened dispute ${disputeNumber} on order ${order.orderNumber}. Funds remain in escrow.`,
      link: `/orders/${order.id}`,
      metadata: { disputeId: dispute.id, orderId: order.id },
      sendEmail: true,
    });

    /* Emit system message into the order chat so both sides see it in
       their thread without polling the order page. */
    await this.emitSystemMessage({
      orderId: order.id,
      event: 'DISPUTE_OPENED',
      content: `Dispute ${disputeNumber} opened. Our team reviews within 6 hours. Funds remain in escrow.`,
    });

    return { id: dispute.id, disputeNumber: dispute.disputeNumber };
  }

  async getOrder(orderId: string, userId: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: DETAIL_INCLUDE,
    });

    if (!order) throw new NotFoundException();
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    return order;
  }

  async listMyOrders(
    userId: string,
    role: 'buyer' | 'seller' | 'all' = 'all',
  ): Promise<OrderListItem[]> {
    const where: Prisma.OrderWhereInput = {};
    if (role === 'buyer') where.buyerId = userId;
    else if (role === 'seller') where.sellerId = userId;
    else where.OR = [{ buyerId: userId }, { sellerId: userId }];

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: LIST_INCLUDE,
    });
  }

  /**
   * Cron-ready auto-release. Runs over orders with autoReleaseAt < now()
   * still in HELD escrow.
   */
  async releaseExpiredEscrow() {
    const expired = await this.prisma.order.findMany({
      where: {
        escrowStatus: 'HELD',
        autoReleaseAt: { lt: new Date() },
        status: { in: ['DELIVERED', 'PAID', 'IN_PROGRESS'] },
      },
      select: { id: true, orderNumber: true },
    });

    for (const e of expired) {
      try {
        await this.releaseToSeller(e.id, 'auto');
        this.logger.log(`Auto-released order ${e.orderNumber}`);
      } catch (err) {
        this.logger.error(
          `Auto-release failed for ${e.orderNumber}`,
          err as Error,
        );
      }
    }

    return { released: expired.length };
  }
}
