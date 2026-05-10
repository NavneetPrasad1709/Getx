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
import {
  CreateOrderFromListingDto,
  CreateOrderFromOfferDto,
  MarkDeliveredDto,
} from './dto/create-order.dto';

const BUYER_FEE_PCT = 0.08;
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
    },
  },
  productListing: {
    select: { id: true, slug: true, sku: true, title: true, images: true },
  },
  customRequest: {
    select: { id: true, requestNumber: true, title: true, tabType: true },
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
    const sellerCommission = round2(amount * SELLER_COMMISSION_PCT);
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
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException();
      if (order.escrowStatus !== 'HELD') return;

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
    });
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
