import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatGateway } from '../conversations/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { PaddlePaymentProvider } from './providers/paddle.provider';
import { StripePaymentProvider } from './providers/stripe.provider';
import { PayPalPaymentProvider } from './providers/paypal.provider';
import { RazorpayPaymentProvider } from './providers/razorpay.provider';
import {
  CheckoutOptions,
  CheckoutSession,
  PaymentProvider,
  PROVIDER_TO_PRISMA,
  ProviderName,
  WebhookEvent,
} from './providers/payment.interface';

const ESCROW_HOLD_DAYS = 3;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Record<ProviderName, PaymentProvider>;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private audit: AuditService,
    private conversations: ConversationsService,
    private chat: ChatGateway,
    private notifications: NotificationsService,
    mock: MockPaymentProvider,
    paddle: PaddlePaymentProvider,
    stripe: StripePaymentProvider,
    paypal: PayPalPaymentProvider,
    razorpay: RazorpayPaymentProvider,
    private loyalty: LoyaltyService,
  ) {
    this.providers = {
      mock,
      paddle,
      stripe,
      paypal,
      razorpay,
    };

    const hasStripe = !!config.get<string>('STRIPE_SECRET_KEY');
    const hasRazorpay = !!config.get<string>('RAZORPAY_KEY_ID');
    const hasPayPal = !!config.get<string>('PAYPAL_CLIENT_ID');
    const hasPaddle = !!config.get<string>('PADDLE_API_KEY');
    this.logger.log(
      `Payment providers — stripe:${hasStripe} paypal:${hasPayPal} razorpay:${hasRazorpay} paddle:${hasPaddle} (mock fallback always on)`,
    );
  }

  /**
   * Per-order provider routing.
   *  - INR  → Razorpay (or mock if RAZORPAY_KEY_ID missing)
   *  - else → Stripe   (or mock if STRIPE_SECRET_KEY missing)
   *
   * Future: PayPal as buyer-opt-in once `Order.buyerPreferredProvider`
   * (or similar) is added. Paddle stays available via direct lookup
   * for legacy orders but is not auto-selected.
   */
  private resolveProvider(currency: string): PaymentProvider {
    const upper = currency.toUpperCase();
    const isProd = process.env.NODE_ENV === 'production';
    if (upper === 'INR') {
      const hasKey = !!this.config.get<string>('RAZORPAY_KEY_ID');
      if (!hasKey && isProd) {
        throw new Error(
          'RAZORPAY_KEY_ID missing in production — refusing to route INR checkout through the mock provider.',
        );
      }
      return hasKey ? this.providers.razorpay : this.providers.mock;
    }
    const hasStripe = !!this.config.get<string>('STRIPE_SECRET_KEY');
    if (!hasStripe && isProd) {
      throw new Error(
        'STRIPE_SECRET_KEY missing in production — refusing to route non-INR checkout through the mock provider.',
      );
    }
    return hasStripe ? this.providers.stripe : this.providers.mock;
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

    /* Subtract any GETX Coins or redeemed loyalty points applied to this
       order so the gateway only charges the remaining balance. Both are
       debited at apply-time (WalletService.applyToOrder /
       LoyaltyService.applyToOrder) and are mutually exclusive by spec. */
    const creditApplied =
      (order.walletApplied ?? 0) + (order.loyaltyUsdApplied ?? 0);
    const chargeable = Math.max(0, order.buyerTotal - creditApplied);
    const opts: CheckoutOptions = {
      orderId: order.id,
      amount: Math.round(chargeable * 100),
      currency: order.currency,
      buyerEmail: order.buyer.email,
      buyerName: order.buyer.name ?? 'Buyer',
      itemTitle: `GETX Order ${order.orderNumber}`,
      itemDescription: `Payment for ${order.orderNumber}`,
      successUrl: `${webUrl}/orders/${order.id}?payment=success`,
      cancelUrl: `${webUrl}/orders/${order.id}?payment=cancelled`,
    };

    const provider = this.resolveProvider(order.currency);
    const session = await provider.createCheckout(opts);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: PROVIDER_TO_PRISMA[provider.name] as
          | 'STRIPE'
          | 'PAYPAL'
          | 'RAZORPAY'
          | 'PADDLE'
          | null,
        paymentTransactionId: session.sessionId,
      },
    });

    return session;
  }

  /**
   * Per-provider webhook handler. URL segment is the source of truth —
   * only that provider's parser is invoked, and we fail closed when the
   * provider has no configured signing secret. This eliminates the
   * fall-through where a missing secret on one provider let an attacker
   * forge a webhook that another provider's loose parser would accept.
   */
  async handleProviderWebhook(
    name: ProviderName,
    headers: Record<string, string>,
    body: string,
  ) {
    const provider = this.providers[name];
    if (!provider) {
      throw new BadRequestException('Unknown provider');
    }

    /* Fail-closed secret check. mock is dev-only and gated by
       NODE_ENV at the controller layer, so we permit it here. */
    if (!this.providerHasSecret(name)) {
      this.logger.error(
        `Webhook for ${name} rejected — provider not configured (missing secret).`,
      );
      throw new BadRequestException('Provider not configured');
    }

    const event = provider.parseWebhook(headers, body);
    if (!event) {
      this.logger.warn(`Invalid webhook for ${name}`);
      throw new BadRequestException('Invalid webhook');
    }

    return this.dispatchEvent(provider, event);
  }

  /**
   * Legacy multi-provider webhook entry. Kept behind a feature flag for
   * back-compat with provider dashboards still hitting /payments/webhook;
   * new integrations MUST use /payments/webhook/:provider.
   */
  async handleWebhook(headers: Record<string, string>, body: string) {
    const order: ProviderName[] = [
      'stripe',
      'razorpay',
      'paypal',
      'paddle',
      'mock',
    ];

    let event: WebhookEvent | null = null;
    let matched: PaymentProvider | null = null;
    for (const name of order) {
      if (!this.providerHasSecret(name)) continue;
      const provider = this.providers[name];
      const parsed = provider.parseWebhook(headers, body);
      if (parsed) {
        event = parsed;
        matched = provider;
        break;
      }
    }

    if (!event || !matched) {
      this.logger.warn('Invalid webhook received');
      throw new BadRequestException('Invalid webhook');
    }

    return this.dispatchEvent(matched, event);
  }

  private providerHasSecret(name: ProviderName): boolean {
    switch (name) {
      case 'stripe':
        return !!this.config.get<string>('STRIPE_WEBHOOK_SECRET');
      case 'razorpay':
        return !!this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
      case 'paypal':
        return !!this.config.get<string>('PAYPAL_WEBHOOK_ID');
      case 'paddle':
        return !!this.config.get<string>('PADDLE_WEBHOOK_SECRET');
      case 'mock':
        /* Mock is dev-only — its webhook handler is reachable from the
           controller's /webhook/:provider route which itself runs only
           outside production. No real-world signing exists. */
        return process.env.NODE_ENV !== 'production';
    }
  }

  /**
   * Idempotency gate + event router. Inserts a WebhookEvent row keyed on
   * (provider, externalId); a duplicate hit returns the prior outcome
   * unchanged so a replayed refund or failure never re-mutates state.
   */
  private async dispatchEvent(
    provider: PaymentProvider,
    event: WebhookEvent,
  ) {
    this.logger.log(
      `Webhook received from ${provider.name}: ${event.type} (${event.externalId})`,
    );

    if (event.externalId) {
      try {
        await this.prisma.webhookEvent.create({
          data: {
            provider: provider.name,
            externalId: event.externalId,
            type: event.type,
          },
        });
      } catch (err) {
        /* P2002 on the (provider, externalId) unique index means we've
           already processed this event — return idempotent ack instead
           of re-running the handler. */
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: string }).code === 'P2002'
        ) {
          this.logger.log(
            `Webhook idempotent skip (already processed): ${provider.name}/${event.externalId}`,
          );
          return { success: true, idempotent: true };
        }
        throw err;
      }
    }

    switch (event.type) {
      case 'checkout.completed':
        return this.processCheckoutCompleted(event, provider);
      case 'payment.failed':
        return this.processPaymentFailed(event);
      case 'refund.completed':
        return this.processRefundCompleted(event);
      default:
        this.logger.log(`Unhandled webhook type: ${event.type}`);
        return { success: true, ignored: true };
    }
  }

  private async processCheckoutCompleted(
    event: WebhookEvent,
    provider: PaymentProvider,
  ) {
    /* New providers (Stripe/PayPal/Razorpay) emit `orderId`, while the
       legacy Paddle path uses `order_id`. Accept either. */
    const orderId = event.metadata.orderId ?? event.metadata.order_id;
    if (!orderId) {
      this.logger.error('Webhook missing orderId in metadata');
      return { success: false, error: 'Missing orderId' };
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

    /* Pull tax surfaced by the provider (Stripe Tax / Paddle / Razorpay
       GST) and persist on the order. taxAmount stays 0 when the provider
       doesn't expose tax so existing receipts stay numerically correct. */
    const taxAmount =
      typeof event.taxAmount === 'number' && event.taxAmount > 0
        ? event.taxAmount
        : 0;
    const taxBreakdown = event.taxBreakdown
      ? (event.taxBreakdown as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

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
          taxAmount,
          taxBreakdown,
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
              provider: provider.name,
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

    // Auto-open conversation + announce. Best-effort — don't fail payment.
    try {
      await this.conversations.getOrCreateConversation(order.buyerId, {
        orderId: order.id,
      });
      const sysMsg = await this.conversations.sendSystemMessage({
        orderId: order.id,
        event: 'ORDER_PAID',
        content: `Payment received ($${order.buyerTotal.toFixed(2)}). Funds held in escrow until delivery is confirmed.`,
      });
      if (sysMsg) {
        this.chat.broadcastToConversation(
          sysMsg.conversationId,
          'message_received',
          sysMsg,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to emit ORDER_PAID system message for ${order.orderNumber}: ${err instanceof Error ? err.message : err}`,
      );
    }

    void this.notifications.create({
      userId: order.sellerId,
      type: 'ORDER_PAID',
      title: 'New paid order',
      message: `Order ${order.orderNumber} - $${order.buyerTotal.toFixed(2)}. Buyer paid; please prepare delivery.`,
      link: `/orders/${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.buyerTotal,
      },
      sendEmail: true,
    });

    this.logger.log(
      `Order paid: ${order.orderNumber} ($${order.buyerTotal.toFixed(2)})`,
    );
    return { success: true };
  }

  private async processPaymentFailed(event: WebhookEvent) {
    const orderId = event.metadata.orderId ?? event.metadata.order_id;
    if (!orderId) return { success: false };

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.status !== 'PENDING') {
      return { success: true, idempotent: true };
    }

    /* Refund any pre-paid credits atomically with the cancel so the
       buyer is never left with applied-but-spent points/coins. Order
       transitions to CANCELLED only after both refunds settle. */
    await this.prisma.$transaction(async (tx) => {
      await this.loyalty.refundOnCancel(tx, orderId);
      /* Wallet refund — uses the same tx so a failure rolls back the
         loyalty restore too. */
      const fresh = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          buyerId: true,
          walletApplied: true,
          currency: true,
          orderNumber: true,
        },
      });
      if (fresh && fresh.walletApplied > 0) {
        const buyer = await tx.user.findUnique({
          where: { id: fresh.buyerId },
          select: { buyerWallet: true },
        });
        if (buyer) {
          const newBalance = buyer.buyerWallet + fresh.walletApplied;
          await tx.user.update({
            where: { id: fresh.buyerId },
            data: { buyerWallet: { increment: fresh.walletApplied } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: fresh.buyerId,
              type: 'REFUND',
              amount: fresh.walletApplied,
              currency: fresh.currency,
              orderId,
              balanceBefore: buyer.buyerWallet,
              balanceAfter: newBalance,
              description: `Refund of wallet credit on cancelled order ${fresh.orderNumber}`,
            },
          });
        }
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Payment failed',
          walletApplied: 0,
        },
      });
    });

    return { success: true };
  }

  private async processRefundCompleted(event: WebhookEvent) {
    const orderId = event.metadata.orderId ?? event.metadata.order_id;
    if (!orderId) return { success: false };

    // Idempotency: webhooks can be redelivered. Treat a replay as a no-op
    // instead of overwriting refundTransactionId / refundedAt, which would
    // break reconciliation if the second event carries a different id.
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (existing?.status === 'REFUNDED') {
      return { success: true, idempotent: true };
    }

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
   * Public refund hook for the admin module. Routes to the same provider
   * that processed the original checkout, falling back to mock when
   * called without a currency hint. Caller is responsible for updating
   * Order/escrow state — this method only triggers the provider call.
   */
  async processRefund(opts: {
    transactionId: string;
    amount?: number;
    reason: string;
    currency?: string;
  }): Promise<{ success: boolean; refundId: string }> {
    const provider = opts.currency
      ? this.resolveProvider(opts.currency)
      : this.providers.mock;
    return provider.refund(opts);
  }

  /**
   * Mock-only: simulate a successful checkout webhook locally. Available
   * whenever the resolved provider for USD is the mock fallback (i.e.
   * STRIPE_SECRET_KEY is unset). The buyerId of the order MUST match
   * the caller — without this check anyone could mark someone else's
   * order PAID by guessing the orderId.
   */
  async simulateMockPayment(
    sessionId: string,
    orderId: string,
    callerId: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException();
    if (order.buyerId !== callerId) {
      throw new BadRequestException('Not your order');
    }

    const provider = this.resolveProvider(order.currency);
    if (provider.name !== 'mock') {
      throw new BadRequestException('Only available with mock provider');
    }

    const fakeEvent: WebhookEvent = {
      type: 'checkout.completed',
      externalId: sessionId,
      amount: Math.round(order.buyerTotal * 100),
      currency: order.currency,
      metadata: { orderId },
      rawPayload: { simulated: true, sessionId },
    };

    return this.processCheckoutCompleted(fakeEvent, provider);
  }

  getProviderName(): string {
    /* Best-effort label for status pages. Returns the USD-default
       provider name (stripe when configured, else mock). */
    return this.resolveProvider('USD').name;
  }
}
