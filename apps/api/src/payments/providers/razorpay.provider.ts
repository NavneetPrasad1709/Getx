import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  CheckoutOptions,
  CheckoutSession,
  PaymentProvider,
  RefundOptions,
  RefundResult,
  WebhookEvent,
} from './payment.interface';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
}

interface RazorpayRefundResponse {
  id: string;
}

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  notes?: Record<string, string>;
}

interface RazorpayOrderEntity {
  id?: string;
  amount?: number;
  currency?: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookPayload {
  payment?: { entity?: RazorpayPaymentEntity };
  order?: { entity?: RazorpayOrderEntity };
  refund?: { entity?: { id?: string } };
}

interface RazorpayWebhookEvent {
  event?: string;
  payload?: RazorpayWebhookPayload;
}

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly apiUrl = 'https://api.razorpay.com/v1';

  constructor(private config: ConfigService) {
    this.keyId = config.get<string>('RAZORPAY_KEY_ID') ?? '';
    this.keySecret = config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    this.webhookSecret = config.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';

    if (!this.keyId) {
      this.logger.warn(
        'RAZORPAY_KEY_ID not configured — Razorpay provider running in MOCK fallback mode.',
      );
    } else {
      this.logger.log('Razorpay provider configured');
      if (!this.webhookSecret) {
        this.logger.warn(
          'RAZORPAY_WEBHOOK_SECRET not set — webhook signatures will not be verified (dev only).',
        );
      }
    }
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    if (!this.keyId) {
      this.logger.warn('===== RAZORPAY MOCK =====');
      this.logger.warn(
        `Mock checkout for order ${opts.orderId} (${opts.currency} ${opts.amount})`,
      );
      return this.mockCheckout(opts);
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
      'base64',
    );
    const response = await fetch(`${this.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: opts.amount,
        currency: opts.currency.toUpperCase(),
        receipt: opts.orderId,
        notes: { orderId: opts.orderId },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Razorpay order creation failed: ${text}`);
      throw new Error('Failed to create Razorpay order');
    }

    const data = (await response.json()) as RazorpayOrderResponse;
    const apiUrl =
      this.config.get<string>('API_URL') ?? 'http://localhost:4000';

    /* Razorpay requires a frontend Checkout.js widget. We return the
       Razorpay order id wrapped in our hosted checkout URL — the page
       boots Razorpay's widget with this order id. */
    return {
      sessionId: data.id,
      checkoutUrl: `${apiUrl}/api/v1/payments/razorpay-checkout/${data.id}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async refund(opts: RefundOptions): Promise<RefundResult> {
    if (!this.keyId) {
      this.logger.warn('===== RAZORPAY MOCK =====');
      this.logger.warn(
        `Mock refund for ${opts.transactionId} (${opts.reason})`,
      );
      return {
        success: true,
        refundId: `mock_razorpay_refund_${randomBytes(8).toString('hex')}`,
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
      'base64',
    );
    const body: Record<string, unknown> = {};
    if (opts.amount) body.amount = opts.amount;

    const response = await fetch(
      `${this.apiUrl}/payments/${opts.transactionId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Razorpay refund failed: ${text}`);
      throw new Error('Razorpay refund failed');
    }

    const data = (await response.json()) as RazorpayRefundResponse;
    return { success: true, refundId: data.id };
  }

  parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): WebhookEvent | null {
    if (this.webhookSecret) {
      const signature = headers['x-razorpay-signature'];
      if (!signature) {
        this.logger.warn('Missing x-razorpay-signature header');
        return null;
      }
      const expected = createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');
      try {
        const expectedBuf = Buffer.from(expected, 'hex');
        const receivedBuf = Buffer.from(signature, 'hex');
        if (
          expectedBuf.length !== receivedBuf.length ||
          !timingSafeEqual(expectedBuf, receivedBuf)
        ) {
          this.logger.warn('Razorpay webhook signature verification failed');
          return null;
        }
      } catch {
        return null;
      }
    } else {
      this.logger.warn(
        'Razorpay webhook received without RAZORPAY_WEBHOOK_SECRET — skipping verification (dev only)',
      );
    }

    try {
      const event = JSON.parse(body) as RazorpayWebhookEvent;
      const payload = event.payload ?? {};
      const paymentEntity = payload.payment?.entity;
      const orderEntity = payload.order?.entity;

      let type: WebhookEvent['type'] = 'unknown';
      switch (event.event) {
        case 'payment.captured':
        case 'order.paid':
          type = 'checkout.completed';
          break;
        case 'payment.failed':
          type = 'payment.failed';
          break;
        case 'refund.processed':
          type = 'refund.completed';
          break;
        default:
          type = 'unknown';
      }

      const externalId =
        paymentEntity?.order_id ?? orderEntity?.id ?? paymentEntity?.id ?? '';
      const amount =
        typeof paymentEntity?.amount === 'number'
          ? paymentEntity.amount / 100
          : typeof orderEntity?.amount === 'number'
            ? orderEntity.amount / 100
            : undefined;
      const currency = paymentEntity?.currency ?? orderEntity?.currency;
      const notesOrderId =
        paymentEntity?.notes?.orderId ?? orderEntity?.notes?.orderId ?? '';

      return {
        type,
        externalId,
        amount,
        currency,
        metadata: { orderId: notesOrderId },
        rawPayload: event as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error(
        `Failed to parse Razorpay webhook body: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private mockCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    const sessionId = `mock_razorpay_${randomBytes(16).toString('hex')}`;
    const apiUrl =
      this.config.get<string>('API_URL') ?? 'http://localhost:4000';
    const params = new URLSearchParams({
      orderId: opts.orderId,
      amount: opts.amount.toString(),
    });
    return Promise.resolve({
      sessionId,
      checkoutUrl: `${apiUrl}/api/v1/payments/mock-checkout/${sessionId}?${params.toString()}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
  }
}
