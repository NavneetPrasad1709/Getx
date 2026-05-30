import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaymentsService } from '../../payments/payments.service';
import {
  ListOrdersDto,
  RefundOrderDto,
  ResolveDisputeDto,
  UserActionDto,
} from '../dto/admin.dto';

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
    include: { author: { select: { id: true, username: true, name: true } } },
  },
} satisfies Prisma.OrderInclude;

export type AdminOrderListItem = Prisma.OrderGetPayload<{ include: typeof ORDER_LIST_INCLUDE }>;
export type AdminOrderDetail = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAIL_INCLUDE }>;

@Injectable()
export class AdminOrderService {
  private readonly logger = new Logger(AdminOrderService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private payments: PaymentsService,
  ) {}

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
      pagination: { page: dto.page, limit: dto.limit, total, totalPages: Math.max(1, Math.ceil(total / dto.limit)) },
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

  async forceReleaseEscrow(adminId: string, orderId: string, dto: UserActionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, buyerId: true, sellerId: true, escrowStatus: true, sellerAmount: true, currency: true },
    });
    if (!order) throw new NotFoundException();
    if (order.escrowStatus !== 'HELD') {
      throw new BadRequestException(`Cannot release: escrow status is ${order.escrowStatus}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const seller = await tx.user.findUnique({
        where: { id: order.sellerId },
        select: { sellerWallet: true },
      });
      if (!seller) throw new NotFoundException('Seller not found');

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', escrowStatus: 'RELEASED', confirmedAt: new Date() },
      });

      const newWallet = seller.sellerWallet.toNumber() + order.sellerAmount.toNumber();
      await tx.user.update({
        where: { id: order.sellerId },
        data: { sellerWallet: { increment: order.sellerAmount }, totalEarned: { increment: order.sellerAmount }, totalSales: { increment: 1 } },
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
      metadata: { reason: dto.reason, orderNumber: order.orderNumber, amount: order.sellerAmount },
      severity: 'CRITICAL',
    });

    void this.notifications.create({
      userId: order.sellerId,
      type: 'ORDER_COMPLETED',
      title: 'Order completed — payment released',
      message: `Order ${order.orderNumber} confirmed by GETX admin. $${order.sellerAmount.toFixed(2)} added to your wallet.`,
      link: `/orders/${order.id}`,
      metadata: { entityType: 'Order', entityId: order.id, amount: order.sellerAmount, adminAction: 'force_release' },
      sendEmail: true,
    });

    void this.notifications.create({
      userId: order.buyerId,
      type: 'ORDER_COMPLETED',
      title: 'Order completed',
      message: `Your order ${order.orderNumber} has been completed by GETX admin review.`,
      link: `/orders/${order.id}`,
      metadata: { entityType: 'Order', entityId: order.id, adminAction: 'force_release' },
      sendEmail: false,
    });

    return { success: true };
  }

  async refundOrder(adminId: string, orderId: string, dto: RefundOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, status: true, escrowStatus: true,
        buyerId: true, sellerId: true, buyerTotal: true, walletApplied: true,
        loyaltyPointsApplied: true, loyaltyUsdApplied: true,
        sellerAmount: true, currency: true, paymentTransactionId: true, paymentProvider: true,
      },
    });
    if (!order) throw new NotFoundException();
    if (!(['PAID', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED'] as const).includes(
      order.status as 'PAID' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED',
    )) {
      throw new BadRequestException(`Cannot refund order in ${order.status} state`);
    }
    if (!order.paymentTransactionId) throw new BadRequestException('No payment transaction recorded');

    const maxRefund = order.buyerTotal.toNumber();
    if (!dto.fullRefund && dto.amount !== undefined && dto.amount > maxRefund) {
      throw new BadRequestException(`Refund amount $${dto.amount} exceeds order total $${maxRefund}`);
    }

    let refundId: string | null = null;
    try {
      const result = await this.payments.processRefund({
        transactionId: order.paymentTransactionId,
        amount: dto.fullRefund ? undefined : Math.round((dto.amount ?? order.buyerTotal.toNumber()) * 100),
        reason: dto.reason,
      });
      refundId = result.refundId;
    } catch (err) {
      this.logger.warn(`Provider refund failed for ${orderId}: ${err instanceof Error ? err.message : err}`);
      throw new BadRequestException('Provider refund failed; order not updated');
    }

    const refundAmountUsd = dto.fullRefund ? order.buyerTotal.toNumber() : (dto.amount ?? order.buyerTotal.toNumber());

    await this.prisma.$transaction(async (tx) => {
      if (order.walletApplied && order.walletApplied.toNumber() > 0) {
        const buyer = await tx.user.findUnique({ where: { id: order.buyerId }, select: { buyerWallet: true } });
        if (buyer) {
          await tx.user.update({ where: { id: order.buyerId }, data: { buyerWallet: { increment: order.walletApplied } } });
          await tx.walletTransaction.create({
            data: {
              userId: order.buyerId, type: 'REFUND', amount: order.walletApplied, currency: order.currency,
              orderId: order.id, balanceBefore: buyer.buyerWallet,
              balanceAfter: buyer.buyerWallet.toNumber() + order.walletApplied.toNumber(),
              description: `Wallet credit restored on admin refund of order ${order.orderNumber}`,
            },
          });
        }
      }

      if (order.loyaltyPointsApplied > 0) {
        await tx.user.update({ where: { id: order.buyerId }, data: { loyaltyPoints: { increment: order.loyaltyPointsApplied } } });
        await tx.loyaltyTransaction.create({
          data: {
            userId: order.buyerId, type: 'ADJUSTMENT', points: order.loyaltyPointsApplied,
            balanceAfter: 0, orderId: order.id,
            description: `Loyalty points restored on admin refund of order ${order.orderNumber}`,
          },
        });
      }

      if ((order.escrowStatus === 'RELEASED' || order.status === 'COMPLETED') && dto.fullRefund) {
        const seller = await tx.user.findUnique({ where: { id: order.sellerId }, select: { sellerWallet: true } });
        if (seller) {
          const clawback = order.sellerAmount.toNumber();
          await tx.user.update({ where: { id: order.sellerId }, data: { sellerWallet: { decrement: clawback } } });
          await tx.walletTransaction.create({
            data: {
              userId: order.sellerId, type: 'CHARGEBACK', amount: -clawback, currency: order.currency,
              orderId: order.id, balanceBefore: seller.sellerWallet,
              balanceAfter: Math.max(0, seller.sellerWallet.toNumber() - clawback),
              description: `Chargeback clawback: admin refund of order ${order.orderNumber}`,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED', escrowStatus: 'REFUNDED', refundedAt: new Date(), refundReason: dto.reason, refundAmount: refundAmountUsd, refundTransactionId: refundId, walletApplied: 0 },
      });
    });

    await this.audit.log({
      userId: adminId, action: 'admin.order_refunded', entity: 'Order', entityId: orderId,
      metadata: { reason: dto.reason, amount: dto.amount, full: dto.fullRefund, refundId },
      severity: 'CRITICAL',
    });

    void this.notifications.create({
      userId: order.buyerId, type: 'ORDER_CANCELLED', title: 'Refund processed',
      message: `$${refundAmountUsd.toFixed(2)} has been refunded to your original payment method for order ${order.orderNumber}.`,
      link: `/orders/${order.id}`,
      metadata: { entityType: 'Order', entityId: order.id, amount: refundAmountUsd, adminAction: 'refund' },
      sendEmail: true,
    });

    void this.notifications.create({
      userId: order.sellerId, type: 'ORDER_CANCELLED', title: 'Order refunded by admin',
      message: `Order ${order.orderNumber} was refunded. Reason: ${dto.reason}`,
      link: `/orders/${order.id}`,
      metadata: { entityType: 'Order', entityId: order.id, amount: refundAmountUsd, adminAction: 'refund' },
      sendEmail: true,
    });

    return { success: true, refundId };
  }

  async resolveDispute(adminId: string, disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, escrowStatus: true, sellerId: true, buyerId: true, sellerAmount: true, buyerTotal: true, currency: true },
        },
      },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      throw new BadRequestException(`Dispute already ${dispute.status}`);
    }

    const order = dispute.order;

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: { status: 'RESOLVED', resolvedById: adminId, resolvedAt: new Date(), resolution: dto.resolution, resolutionNotes: dto.notes, refundAmount: dto.refundAmount },
      });

      if (dto.resolution === 'REFUND_BUYER' || dto.resolution === 'PARTIAL_REFUND') {
        const refundAmt = dto.resolution === 'PARTIAL_REFUND' ? (dto.refundAmount ?? order.buyerTotal.toNumber()) : order.buyerTotal.toNumber();
        if (order.escrowStatus === 'RELEASED') {
          const seller = await tx.user.findUnique({ where: { id: order.sellerId }, select: { sellerWallet: true } });
          if (seller) {
            const clawback = Math.min(refundAmt, order.sellerAmount.toNumber());
            await tx.user.update({ where: { id: order.sellerId }, data: { sellerWallet: { decrement: clawback } } });
            await tx.walletTransaction.create({
              data: {
                userId: order.sellerId, type: 'CHARGEBACK', amount: -clawback, currency: order.currency,
                orderId: order.id, balanceBefore: seller.sellerWallet,
                balanceAfter: Math.max(0, seller.sellerWallet.toNumber() - clawback),
                description: `Dispute ${dispute.disputeNumber} resolved: chargeback`,
              },
            });
          }
        }
        await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED', escrowStatus: 'REFUNDED', refundAmount: refundAmt } });
      } else if (dto.resolution === 'RELEASE_TO_SELLER' && order.escrowStatus === 'HELD') {
        const seller = await tx.user.findUnique({ where: { id: order.sellerId }, select: { sellerWallet: true } });
        if (seller) {
          await tx.user.update({
            where: { id: order.sellerId },
            data: { sellerWallet: { increment: order.sellerAmount }, totalEarned: { increment: order.sellerAmount }, totalSales: { increment: 1 } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: order.sellerId, type: 'ORDER_RELEASED', amount: order.sellerAmount, currency: order.currency,
              orderId: order.id, balanceBefore: seller.sellerWallet,
              balanceAfter: seller.sellerWallet.toNumber() + order.sellerAmount.toNumber(),
              description: `Dispute ${dispute.disputeNumber} resolved: escrow released to seller`,
            },
          });
          await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED', escrowStatus: 'RELEASED' } });
        }
      }
    });

    await this.audit.log({
      userId: adminId, action: 'admin.dispute_resolved', entity: 'Dispute', entityId: disputeId,
      metadata: { disputeNumber: dispute.disputeNumber, resolution: dto.resolution, notes: dto.notes },
      severity: 'CRITICAL',
    });

    void this.notifications.create({
      userId: order.buyerId, type: 'DISPUTE_RESOLVED', title: 'Dispute resolved',
      message: `Dispute ${dispute.disputeNumber} on order ${order.orderNumber} has been resolved.`,
      link: `/orders/${order.id}`, metadata: { disputeId, resolution: dto.resolution }, sendEmail: true,
    });
    void this.notifications.create({
      userId: order.sellerId, type: 'DISPUTE_RESOLVED', title: 'Dispute resolved',
      message: `Dispute ${dispute.disputeNumber} on order ${order.orderNumber} has been resolved.`,
      link: `/orders/${order.id}`, metadata: { disputeId, resolution: dto.resolution }, sendEmail: true,
    });

    return { success: true, resolution: dto.resolution };
  }
}
