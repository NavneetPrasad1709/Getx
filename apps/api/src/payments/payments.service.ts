import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { PaddlePaymentProvider } from './providers/paddle.provider';
import {
  CheckoutOptions,
  CheckoutSession,
  PaymentProvider,
  WebhookEvent,
} from './providers/payment.interface';

const ESCROW_HOLD_DAYS = 3;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly provider: PaymentProvider;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private audit: AuditService,
    mock: MockPaymentProvider,
    paddle: PaddlePaymentProvider,
  ) {
    this.provider = config.get<string>('PADDLE_API_KEY') ? paddle : mock;
    this.logger.log(`Payment provider: ${this.provider.name}`);
  }

  async createCheckoutSession(
    orderId: string,
    userId: string,
  ): Promise<CheckoutSession> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, email: true, name: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) {
      throw new BadRequestException('Not your order');
    }
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order not awaiting payment');
    }

    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';

    const opts: CheckoutOptions = {
      orderId: order.id,
      amount: Math.round(order.buyerTotal * 100),
      currency: order.currency,
      buyerEmail: order.buyer.email,
      buyerName: order.buyer.name ?? 'Buyer',
      itemTitle: `GETX Order ${order.orderNumber}`,
      itemDescription: `Payment for ${order.orderNumber}`,
      successUrl: `${webUrl}/orders/${order.id}?payment=success`,
      cancelUrl: `${webUrl}/orders/${order.id}?payment=cancelled`,
    };

    const session = await this.provider.createCheckout(opts);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: this.provider.name === 'paddle' ? 'PADDLE' : null,
        paymentTransactionId: session.sessionId,
      },
    });

    return session;
  }

  async handleWebhook(headers: Record<string, string>, body: string) {
    const event = this.provider.parseWebhook(headers, body);
    if (!event) {
      this.logger.warn('Invalid webhook received');
      throw new BadRequestException('Invalid webhook');
    }

    this.logger.log(`Webhook received: ${event.type} (${event.externalId})`);

    switch (event.type) {
      case 'checkout.completed':
        return this.processCheckoutCompleted(event);
      case 'payment.failed':
        return this.processPaymentFailed(event);
      case 'refund.completed':
        return this.processRefundCompleted(event);
      default:
        this.logger.log(`Unhandled webhook type: ${event.type}`);
        return { success: true, ignored: true };
    }
  }

  private async processCheckoutCompleted(event: WebhookEvent) {
    const orderId = event.metadata.order_id;
    if (!orderId) {
      this.logger.error('Webhook missing order_id in metadata');
      return { success: false, error: 'Missing order_id' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        productListing: true,
        customRequest: true,
      },
    });

    if (!order) {
      this.logger.error(`Order not found: ${orderId}`);
      return { success: false, error: 'Order not found' };
    }

    // Idempotency: if already paid, skip
    if (order.status !== 'PENDING') {
      this.logger.log(
        `Webhook idempotent skip: order ${orderId} status=${order.status}`,
      );
      return { success: true, idempotent: true };
    }

    const autoReleaseAt = new Date(
      Date.now() + ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          escrowStatus: 'HELD',
          paymentCapturedAt: new Date(),
          paymentTransactionId: event.externalId,
          paymentMetadata: event.rawPayload as Prisma.InputJsonValue,
          autoReleaseAt,
        },
      });

      // Decrement listing stock if applicable
      if (
        order.productListingId &&
        order.productListing &&
        order.productListing.stock > 0
      ) {
        await tx.productListing.update({
          where: { id: order.productListingId },
          data: {
            stock: { decrement: 1 },
            soldCount: { increment: 1 },
          },
        });
      }

      // If from offer: accept this offer, reject siblings, mark request IN_PROGRESS
      if (order.offerId) {
        await tx.offer.update({
          where: { id: order.offerId },
          data: { status: 'ACCEPTED', orderId: order.id },
        });

        if (order.customRequestId) {
          await tx.offer.updateMany({
            where: {
              requestId: order.customRequestId,
              id: { not: order.offerId },
              status: 'PENDING',
            },
            data: { status: 'REJECTED' },
          });
          await tx.customRequest.update({
            where: { id: order.customRequestId },
            data: { status: 'IN_PROGRESS' },
          });
        }
      }

      // Move buyer's "paid" amount conceptually — track via WalletTransaction.
      // We don't actually debit a wallet (buyer pays from external card),
      // but log a trail entry so the order has a transaction record.
      const buyer = await tx.user.findUnique({
        where: { id: order.buyerId },
        select: { buyerWallet: true },
      });
      if (buyer) {
        await tx.walletTransaction.create({
          data: {
            userId: order.buyerId,
            type: 'ADJUSTMENT',
            amount: -order.buyerTotal,
            currency: order.currency,
            orderId: order.id,
            balanceBefore: buyer.buyerWallet,
            balanceAfter: buyer.buyerWallet,
            description: `Payment for order ${order.orderNumber}`,
            metadata: {
              externalId: event.externalId,
              provider: this.provider.name,
            },
          },
        });
      }
    });

    await this.audit.log({
      userId: order.buyerId,
      action: 'order.paid',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        amount: order.buyerTotal,
        externalId: event.externalId,
      },
      severity: 'WARNING',
    });

    this.logger.log(
      `Order paid: ${order.orderNumber} ($${order.buyerTotal.toFixed(2)})`,
    );
    return { success: true };
  }

  private async processPaymentFailed(event: WebhookEvent) {
    const orderId = event.metadata.order_id;
    if (!orderId) return { success: false };

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.status !== 'PENDING') {
      return { success: true, idempotent: true };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'Payment failed',
      },
    });

    return { success: true };
  }

  private async processRefundCompleted(event: WebhookEvent) {
    const orderId = event.metadata.order_id;
    if (!orderId) return { success: false };

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        escrowStatus: 'REFUNDED',
        refundedAt: new Date(),
        refundTransactionId: event.externalId,
      },
    });

    return { success: true };
  }

  /**
   * Mock-only: simulate a successful checkout webhook locally.
   */
  async simulateMockPayment(sessionId: string, orderId: string) {
    if (this.provider.name !== 'mock') {
      throw new BadRequestException('Only available with mock provider');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException();

    const fakeEvent: WebhookEvent = {
      type: 'checkout.completed',
      externalId: sessionId,
      amount: Math.round(order.buyerTotal * 100),
      currency: order.currency,
      metadata: { order_id: orderId },
      rawPayload: { simulated: true, sessionId },
    };

    return this.processCheckoutCompleted(fakeEvent);
  }

  getProviderName(): string {
    return this.provider.name;
  }
}
