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
import { firstOrigin } from '../common/config-helpers';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatGateway } from '../conversations/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { StripePaymentProvider } from './providers/stripe.provider';
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
  // Resolved once at boot — provider is determined by static config, not per-request.
  // This eliminates repeated env-var lookups on every checkout call.
  private readonly activeProvider: PaymentProvider;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private audit: AuditService,
    private conversations: ConversationsService,
    private chat: ChatGateway,
    private notifications: NotificationsService,
    mock: MockPaymentProvider,
    stripe: StripePaymentProvider,
    private loyalty: LoyaltyService,
  ) {
    this.providers = { mock, stripe };

    const isProd = process.env.NODE_ENV === 'production';
    const hasStripe = !!config.get<string>('STRIPE_SECRET_KEY');

    if (!hasStripe && isProd) {
      throw new Error(
        'STRIPE_SECRET_KEY missing in production — refusing to start without a real payment provider.',
      );
    }

    this.activeProvider = hasStripe ? stripe : mock;
    this.logger.log(
      `Payment provider resolved at boot: ${this.activeProvider.name} (stripe:${hasStripe})`,
    );
  }

  /**
   * Returns the active payment provider. Currency parameter is reserved for
   * future multi-provider routing (e.g. local payment rails per region); for
   * now Stripe handles all currencies globally.
   */
  private resolveProvider(_currency?: string): PaymentProvider {
    return this.activeProvider;
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

    const webUrl = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');

    /* Subtract any GETX Coins or redeemed loyalty points applied to this
       order so the gateway only charges the remaining balance. Both are
       debited at apply-time (WalletService.applyToOrder /
       LoyaltyService.applyToOrder) and are mutually exclusive by spec. */
    const creditApplied =
      (order.walletApplied?.toNumber() ?? 0) + (order.loyaltyUsdApplied?.toNumber() ?? 0);
    const chargeable = Math.max(0, order.buyerTotal.toNumber() - creditApplied);
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
        paymentProvider: PROVIDER_TO_PRISMA[provider.name] as 'STRIPE' | null,
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

    const event = await provider.parseWebhook(headers, body);
    if (!event) {
      this.logger.warn(`Invalid webhook for ${name}`);
      throw new BadRequestException('Invalid webhook');
    }

    return this.dispatchEvent(provider, event);
  }

  /**
   * Legacy multi-provider webhook entry. Hard-disabled in production — any
   * remaining provider dashboards must migrate to /payments/webhook/:provider.
   * Kept in dev for backward-compat with local tooling.
   */
  async handleWebhook(headers: Record<string, string>, body: string) {
    // PAY-HIGH-023: block legacy endpoint in production — mock parseWebhook
    // accepts any JSON body and would be a wide-open attack surface
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        'Legacy /payments/webhook called in production — rejecting. Update provider dashboards to use /payments/webhook/:provider.',
      );
      throw new BadRequestException(
        'Legacy webhook endpoint disabled. Use /payments/webhook/:provider.',
      );
    }

    const order: ProviderName[] = ['stripe', 'mock'];

    let event: WebhookEvent | null = null;
    let matched: PaymentProvider | null = null;
    for (const name of order) {
      if (!this.providerHasSecret(name)) continue;
      const provider = this.providers[name];
      const parsed = await provider.parseWebhook(headers, body);
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
        // PAY-HIGH-022: require BOTH secrets together — not just the webhook secret
        return (
          !!this.config.get<string>('STRIPE_SECRET_KEY') &&
          !!this.config.get<string>('STRIPE_WEBHOOK_SECRET')
        );
      case 'mock':
        /* Mock is dev-only — its webhook handler is reachable from the
           controller's /webhook/:provider route which itself runs only
           outside production. No real-world signing exists. */
        return process.env.NODE_ENV !== 'production';
    }
  }

  /**
   * Idempotency gate + event router.
   *
   * PAY-CRIT-001: WebhookEvent row is written INSIDE each handler's
   * $transaction so a DB error in the handler rolls back both the business
   * state AND the idempotency record atomically. A pre-insert (the old
   * approach) meant a transient handler error permanently swallowed retries.
   *
   * PAY-MED-026: Events with no externalId are rejected before dispatch —
   * an empty string would skip the unique constraint and run the handler on
   * every retry without recording anything.
   */
  private async dispatchEvent(provider: PaymentProvider, event: WebhookEvent) {
    this.logger.log(
      `Webhook received from ${provider.name}: ${event.type} (${event.externalId})`,
    );

    // Reject events with no stable external ID — can't safely deduplicate them
    if (!event.externalId) {
      this.logger.error(
        `Webhook from ${provider.name} has no externalId — rejected (${event.type})`,
      );
      return { success: false, error: 'Missing externalId' };
    }

    // Fast pre-check: common replay path avoids running the handler at all
    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_externalId: {
          provider: provider.name,
          externalId: event.externalId,
        },
      },
    });
    if (existing) {
      this.logger.log(
        `Webhook idempotent skip (already processed): ${provider.name}/${event.externalId}`,
      );
      return { success: true, idempotent: true };
    }

    try {
      switch (event.type) {
        case 'checkout.completed':
          return await this.processCheckoutCompleted(event, provider);
        case 'payment.failed':
          return await this.processPaymentFailed(event, provider.name);
        case 'refund.completed':
          return await this.processRefundCompleted(event, provider.name);
        default:
          // Record unknown events so at least the delivery is traceable
          await this.prisma.webhookEvent.create({
            data: {
              provider: provider.name,
              externalId: event.externalId,
              type: event.type,
            },
          });
          this.logger.log(`Unhandled webhook type: ${event.type}`);
          return { success: true, ignored: true };
      }
    } catch (err) {
      // P2002 inside a handler's $transaction means a concurrent request won
      // the race and already committed — safe to treat as idempotent
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        this.logger.log(
          `Webhook idempotent (concurrent commit): ${provider.name}/${event.externalId}`,
        );
        return { success: true, idempotent: true };
      }
      throw err;
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

    // PAY-CRIT-003: verify amount and currency match what the order expects.
    // A $1 Stripe session against a $1000 order must be rejected, not auto-completed.
    const creditApplied =
      (order.walletApplied?.toNumber() ?? 0) +
      (order.loyaltyUsdApplied?.toNumber() ?? 0);
    const expectedUsd = Math.max(0, order.buyerTotal.toNumber() - creditApplied);
    const expectedCents = Math.round(expectedUsd * 100);
    if (
      event.currency &&
      event.currency.toUpperCase() !== order.currency.toUpperCase()
    ) {
      this.logger.error(
        `Webhook currency mismatch for ${orderId}: expected ${order.currency} got ${event.currency}`,
      );
      return { success: false, error: 'Currency mismatch' };
    }
    if (typeof event.amount === 'number') {
      const receivedCents = Math.round(event.amount * 100);
      if (Math.abs(receivedCents - expectedCents) > 1) {
        this.logger.error(
          `Webhook amount mismatch for ${orderId}: expected ${expectedCents}¢ got ${receivedCents}¢`,
        );
        return { success: false, error: 'Amount mismatch' };
      }
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
      // PAY-CRIT-001: write idempotency record INSIDE the transaction so a
      // handler error rolls back both state and the record atomically
      await tx.webhookEvent.create({
        data: {
          provider: provider.name,
          externalId: event.externalId,
          type: event.type,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          escrowStatus: 'HELD',
          paymentCapturedAt: new Date(),
          paymentTransactionId: event.externalId,
          // PAY-HIGH-025: merge provider event into existing metadata instead
          // of replacing it — preserves snapshotTitle/snapshot/quantity that
          // orders.service wrote at creation time
          paymentMetadata: {
            ...(order.paymentMetadata as object ?? {}),
            providerEvent: event.rawPayload,
          } as Prisma.InputJsonValue,
          autoReleaseAt,
          taxAmount,
          taxBreakdown,
        },
      });

      /* Stock was already decremented when the order was created
         (atomic reserve in orders.service.createFromListing). On
         payment success we only need to bump the soldCount visible to
         the seller dashboard. */
      if (order.productListingId && order.productListing) {
        await tx.productListing.update({
          where: { id: order.productListingId },
          data: { soldCount: { increment: 1 } },
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
      /* Defence-in-depth — the WebhookEvent table + status guards
         already prevent re-entry into this function, but if a future
         caller wires up a second trigger for ORDER_PAID we still won't
         double-fire the email. */
      dedupeKey: `order:${order.id}:paid`,
      sendEmail: true,
    });

    /* Live push to the seller's open dashboards so the orders queue
       refreshes the instant the order lands — without this the seller
       only sees the new row on the next React Query refocus poll.
       The chat gateway scopes the emit to the seller's per-user room
       so a buyer never sees seller order pushes. */
    this.chat.broadcastToUser(order.sellerId, 'order:new', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.buyerTotal,
    });

    this.logger.log(
      `Order paid: ${order.orderNumber} ($${order.buyerTotal.toFixed(2)})`,
    );
    return { success: true };
  }

  private async processPaymentFailed(event: WebhookEvent, providerName: string) {
    const orderId = event.metadata.orderId ?? event.metadata.order_id;
    if (!orderId) return { success: false };

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.status !== 'PENDING') {
      return { success: true, idempotent: true };
    }

    await this.prisma.$transaction(async (tx) => {
      // PAY-CRIT-001: idempotency record inside the transaction
      await tx.webhookEvent.create({
        data: { provider: providerName, externalId: event.externalId, type: event.type },
      });

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
          productListingId: true,
          // PAY-HIGH-024: use the dedicated quantity column — reliable even
          // after paymentMetadata is overwritten by processCheckoutCompleted
          quantity: true,
        },
      });
      /* Restore the reserved listing stock — order creation took it
         out of inventory and the cancellation must put it back so the
         listing doesn't lose a unit to a buyer who never paid. */
      if (fresh?.productListingId) {
        await tx.productListing.update({
          where: { id: fresh.productListingId },
          data: { stock: { increment: fresh.quantity ?? 1 } },
        });
      }
      if (fresh && fresh.walletApplied.toNumber() > 0) {
        const buyer = await tx.user.findUnique({
          where: { id: fresh.buyerId },
          select: { buyerWallet: true },
        });
        if (buyer) {
          const newBalance = buyer.buyerWallet.toNumber() + fresh.walletApplied.toNumber();
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

  private async processRefundCompleted(event: WebhookEvent, providerName: string) {
    const orderId = event.metadata.orderId ?? event.metadata.order_id;
    if (!orderId) return { success: false };

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        escrowStatus: true,
        sellerId: true,
        sellerAmount: true,
        buyerTotal: true,
        refundAmount: true,
        currency: true,
        orderNumber: true,
      },
    });
    if (!order) return { success: false, error: 'Order not found' };
    if (order.status === 'REFUNDED') return { success: true, idempotent: true };

    // PAY-MED-028: compare provider-reported amount against admin-set refundAmount.
    // Mismatch means the provider applied a different amount (e.g. partial override).
    // Log as warning and persist the actual provider amount so reconciliation is accurate.
    if (
      typeof event.amount === 'number' &&
      order.refundAmount !== null &&
      order.refundAmount !== undefined
    ) {
      const expectedCents = Math.round(order.refundAmount.toNumber() * 100);
      const receivedCentsMed = Math.round(event.amount * 100);
      if (Math.abs(receivedCentsMed - expectedCents) > 1) {
        this.logger.warn(
          `Refund amount mismatch for order ${order.orderNumber}: admin set ${expectedCents}¢, provider reported ${receivedCentsMed}¢ — persisting provider amount`,
        );
        await this.prisma.order.update({
          where: { id: orderId },
          data: { refundAmount: event.amount },
        });
      }
    }

    // PAY-CRIT-009: if escrow was already RELEASED (seller paid), claw back.
    // Determine full vs partial by comparing received amount to order total.
    const receivedCents =
      typeof event.amount === 'number' ? Math.round(event.amount * 100) : null;
    const orderCents = Math.round(order.buyerTotal.toNumber() * 100);
    const isFullRefund =
      receivedCents === null || receivedCents >= orderCents - 1;

    await this.prisma.$transaction(async (tx) => {
      // PAY-CRIT-001: idempotency record inside the transaction
      await tx.webhookEvent.create({
        data: { provider: providerName, externalId: event.externalId, type: event.type },
      });

      // Claw back seller wallet when escrow was already released and this is
      // a full refund — platform absorbs the loss and debits from sellerWallet
      if (isFullRefund && order.escrowStatus === 'RELEASED') {
        const seller = await tx.user.findUnique({
          where: { id: order.sellerId },
          select: { sellerWallet: true },
        });
        if (seller) {
          const clawback = order.sellerAmount.toNumber();
          const newWallet = Math.max(0, seller.sellerWallet.toNumber() - clawback);
          await tx.user.update({
            where: { id: order.sellerId },
            data: { sellerWallet: { decrement: clawback } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: order.sellerId,
              type: 'CHARGEBACK',
              amount: -clawback,
              currency: order.currency,
              orderId,
              balanceBefore: seller.sellerWallet,
              balanceAfter: newWallet,
              description: `Chargeback clawback for refunded order ${order.orderNumber}`,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          escrowStatus: 'REFUNDED',
          refundedAt: new Date(),
          refundTransactionId: event.externalId,
        },
      });
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
    // PAY-MED-030: explicit opt-in flag required — NODE_ENV check alone lets
    // staging/test envs accept free orders if NODE_ENV isn't set to 'production'
    const mockEnabled =
      this.config.get<string>('PAYMENTS_ENABLE_MOCK') === 'true';
    if (!mockEnabled || process.env.NODE_ENV === 'production') {
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
      amount: Math.round(order.buyerTotal.toNumber() * 100),
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
