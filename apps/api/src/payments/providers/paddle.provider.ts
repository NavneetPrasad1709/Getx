import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CheckoutOptions,
  CheckoutSession,
  PaymentProvider,
  RefundOptions,
  RefundResult,
  WebhookEvent,
} from './payment.interface';

interface PaddleTransactionResponse {
  data: {
    id: string;
    checkout?: { url?: string };
  };
}

interface PaddleAdjustmentResponse {
  data: { id: string };
}

interface PaddleWebhookData {
  event_type?: string;
  data?: {
    id?: string;
    action?: string;
    currency_code?: string;
    custom_data?: Record<string, string>;
    details?: { totals?: { total?: string } };
  };
}

@Injectable()
export class PaddlePaymentProvider implements PaymentProvider {
  readonly name = 'paddle' as const;
  private readonly logger = new Logger(PaddlePaymentProvider.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly apiUrl: string;
  private readonly isSandbox: boolean;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('PADDLE_API_KEY') ?? '';
    this.webhookSecret = config.get<string>('PADDLE_WEBHOOK_SECRET') ?? '';
    this.isSandbox = config.get<string>('PADDLE_ENV') !== 'production';
    this.apiUrl = this.isSandbox
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com';

    if (this.apiKey) {
      this.logger.log(
        `Paddle ${this.isSandbox ? 'SANDBOX' : 'PRODUCTION'} configured`,
      );
    }
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    if (!this.apiKey) throw new BadRequestException('Paddle not configured');

    const response = await fetch(`${this.apiUrl}/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            quantity: 1,
            price: {
              description: opts.itemTitle,
              name: opts.itemTitle,
              unit_price: {
                amount: opts.amount.toString(),
                currency_code: opts.currency,
              },
              quantity: { minimum: 1, maximum: 1 },
              tax_mode: 'account_setting',
            },
          },
        ],
        customer: { email: opts.buyerEmail },
        custom_data: { order_id: opts.orderId },
        checkout: { url: opts.successUrl },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error('Paddle checkout creation failed', text);
      throw new BadRequestException('Failed to create checkout session');
    }

    const data = (await response.json()) as PaddleTransactionResponse;

    return {
      sessionId: data.data.id,
      checkoutUrl:
        data.data.checkout?.url ??
        `https://${this.isSandbox ? 'sandbox-' : ''}checkout.paddle.com/checkout/${data.data.id}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  async refund(opts: RefundOptions): Promise<RefundResult> {
    if (!this.apiKey) throw new BadRequestException('Paddle not configured');

    const response = await fetch(`${this.apiUrl}/adjustments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'refund',
        transaction_id: opts.transactionId,
        reason: opts.reason,
        type: opts.amount ? 'partial' : 'full',
      }),
    });

    if (!response.ok) throw new BadRequestException('Refund failed');

    const data = (await response.json()) as PaddleAdjustmentResponse;
    return { success: true, refundId: data.data.id };
  }

  parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): WebhookEvent | null {
    const signature = headers['paddle-signature'];
    if (!signature || !this.webhookSecret) {
      this.logger.warn('Webhook signature missing or secret not configured');
      return null;
    }

    const parts = signature
      .split(';')
      .reduce<Record<string, string>>((acc, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

    if (!parts.ts || !parts.h1) return null;

    const payload = `${parts.ts}:${body}`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const receivedBuf = Buffer.from(parts.h1, 'hex');
      if (
        expectedBuf.length !== receivedBuf.length ||
        !timingSafeEqual(expectedBuf, receivedBuf)
      ) {
        this.logger.warn('Webhook signature verification failed');
        return null;
      }
    } catch {
      return null;
    }

    try {
      const data = JSON.parse(body) as PaddleWebhookData;
      const eventType = data.event_type;

      let type: WebhookEvent['type'] = 'unknown';
      if (eventType === 'transaction.completed') type = 'checkout.completed';
      else if (eventType === 'transaction.payment_failed')
        type = 'payment.failed';
      else if (
        eventType === 'adjustment.created' &&
        data.data?.action === 'refund'
      ) {
        type = 'refund.completed';
      }

      const totalStr = data.data?.details?.totals?.total;
      return {
        type,
        externalId: data.data?.id ?? '',
        amount: totalStr ? parseInt(totalStr, 10) : undefined,
        currency: data.data?.currency_code,
        metadata: data.data?.custom_data ?? {},
        rawPayload: data as unknown as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  }
}
