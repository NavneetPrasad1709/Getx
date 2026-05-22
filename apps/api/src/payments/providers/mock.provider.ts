import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  CheckoutOptions,
  CheckoutSession,
  PaymentProvider,
  RefundOptions,
  RefundResult,
  WebhookEvent,
} from './payment.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;
  private readonly logger = new Logger(MockPaymentProvider.name);

  constructor(private config: ConfigService) {}

  createCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    const sessionId = `mock_${randomBytes(16).toString('hex')}`;
    const apiUrl =
      this.config.get<string>('API_URL') ?? 'http://localhost:4000';

    const params = new URLSearchParams({
      orderId: opts.orderId,
      amount: opts.amount.toString(),
    });
    const checkoutUrl = `${apiUrl}/api/v1/payments/mock-checkout/${sessionId}?${params.toString()}`;

    return Promise.resolve({
      sessionId,
      checkoutUrl,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
  }

  refund(opts: RefundOptions): Promise<RefundResult> {
    this.logger.log(
      `Mock refund: ${opts.transactionId} - $${opts.amount ?? 'full'} (${opts.reason})`,
    );
    return Promise.resolve({
      success: true,
      refundId: `mock_refund_${randomBytes(8).toString('hex')}`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- async only to satisfy the PayPal-driven interface contract
  async parseWebhook(
    _headers: Record<string, string>,
    body: string,
  ): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(body) as Record<string, unknown>;
      const type =
        typeof data.type === 'string'
          ? (data.type as WebhookEvent['type'])
          : 'unknown';
      return {
        type,
        externalId: typeof data.sessionId === 'string' ? data.sessionId : '',
        amount: typeof data.amount === 'number' ? data.amount : undefined,
        currency: typeof data.currency === 'string' ? data.currency : undefined,
        metadata: (data.metadata as Record<string, string>) ?? {},
        rawPayload: data,
      };
    } catch {
      return null;
    }
  }
}
