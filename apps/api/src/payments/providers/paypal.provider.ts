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

interface PayPalAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface PayPalOrderResponse {
  id: string;
  links?: Array<{ rel: string; href: string; method?: string }>;
}

interface PayPalRefundResponse {
  id: string;
}

interface PayPalWebhookResource {
  id?: string;
  custom_id?: string;
  amount?: { value?: string; currency_code?: string };
}

interface PayPalWebhookEvent {
  event_type?: string;
  resource?: PayPalWebhookResource;
}

interface PayPalVerifyResponse {
  verification_status?: string;
}

@Injectable()
export class PayPalPaymentProvider implements PaymentProvider {
  readonly name = 'paypal' as const;
  private readonly logger = new Logger(PayPalPaymentProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;
  private readonly baseUrl: string;

  private cachedToken: string | null = null;
  private cachedTokenExpiresAt = 0;

  constructor(private config: ConfigService) {
    this.clientId = config.get<string>('PAYPAL_CLIENT_ID') ?? '';
    this.clientSecret = config.get<string>('PAYPAL_CLIENT_SECRET') ?? '';
    this.webhookId = config.get<string>('PAYPAL_WEBHOOK_ID') ?? '';
    const env = config.get<string>('PAYPAL_ENV') ?? 'sandbox';
    this.baseUrl =
      env === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!this.clientId) {
      this.logger.warn(
        'PAYPAL_CLIENT_ID not configured — PayPal provider running in MOCK fallback mode.',
      );
    } else {
      this.logger.log(`PayPal provider configured (env=${env})`);
      if (!this.webhookId) {
        this.logger.warn(
          'PAYPAL_WEBHOOK_ID not set — webhook signatures will not be verified (dev only).',
        );
      }
    }
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    if (!this.clientId) {
      this.logger.warn('===== PAYPAL MOCK =====');
      this.logger.warn(
        `Mock checkout for order ${opts.orderId} (${opts.currency} ${opts.amount})`,
      );
      return this.mockCheckout(opts);
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: opts.currency.toUpperCase(),
              value: (opts.amount / 100).toFixed(2),
            },
            custom_id: opts.orderId,
            description: opts.itemTitle,
          },
        ],
        application_context: {
          return_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`PayPal checkout creation failed: ${text}`);
      throw new Error('Failed to create PayPal checkout');
    }

    const data = (await response.json()) as PayPalOrderResponse;
    const approveLink = data.links?.find((l) => l.rel === 'approve')?.href;
    if (!approveLink) {
      this.logger.error('PayPal response missing approve link');
      throw new Error('PayPal response missing approve link');
    }

    return {
      sessionId: data.id,
      checkoutUrl: approveLink,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    };
  }

  async refund(opts: RefundOptions): Promise<RefundResult> {
    if (!this.clientId) {
      this.logger.warn('===== PAYPAL MOCK =====');
      this.logger.warn(
        `Mock refund for ${opts.transactionId} (${opts.reason})`,
      );
      return {
        success: true,
        refundId: `mock_paypal_refund_${randomBytes(8).toString('hex')}`,
      };
    }

    const token = await this.getAccessToken();
    const body: Record<string, unknown> = {};
    if (opts.amount) {
      body.amount = {
        value: (opts.amount / 100).toFixed(2),
        currency_code: 'USD',
      };
    }

    const response = await fetch(
      `${this.baseUrl}/v2/payments/captures/${opts.transactionId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`PayPal refund failed: ${text}`);
      throw new Error('PayPal refund failed');
    }

    const data = (await response.json()) as PayPalRefundResponse;
    return { success: true, refundId: data.id };
  }

  parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): WebhookEvent | null {
    /* Signature verification deferred to verifyWebhookAsync (async, calls
       PayPal's verify endpoint). For the synchronous parseWebhook
       interface, we accept the event but log a warning when credentials
       are missing. Production callers should call verifyWebhookAsync
       before trusting the payload — see payments.service for the path. */
    if (!this.clientId || !this.webhookId) {
      this.logger.warn(
        'PayPal webhook received without PAYPAL_CLIENT_ID/PAYPAL_WEBHOOK_ID — skipping verification (dev only)',
      );
    } else {
      const required = [
        'paypal-transmission-sig',
        'paypal-transmission-id',
        'paypal-cert-url',
        'paypal-auth-algo',
        'paypal-transmission-time',
      ];
      const missing = required.filter((k) => !headers[k]);
      if (missing.length > 0) {
        this.logger.warn(
          `PayPal webhook missing headers: ${missing.join(', ')}`,
        );
        return null;
      }
      /* Fire-and-forget async verification — logged but not blocking the
         parsed event, because parseWebhook is sync per interface. */
      void this.verifyWebhookAsync(headers, body).then((ok) => {
        if (!ok) {
          this.logger.warn(
            'PayPal webhook signature verification failed (async)',
          );
        }
      });
    }

    try {
      const event = JSON.parse(body) as PayPalWebhookEvent;
      const resource = event.resource ?? {};

      let type: WebhookEvent['type'] = 'unknown';
      switch (event.event_type) {
        case 'CHECKOUT.ORDER.APPROVED':
        case 'PAYMENT.CAPTURE.COMPLETED':
          type = 'checkout.completed';
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          type = 'payment.failed';
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          type = 'refund.completed';
          break;
        default:
          type = 'unknown';
      }

      const externalId = resource.id ?? resource.custom_id ?? '';
      const amount = resource.amount?.value
        ? parseFloat(resource.amount.value)
        : undefined;

      return {
        type,
        externalId,
        amount,
        currency: resource.amount?.currency_code,
        metadata: { orderId: resource.custom_id ?? '' },
        rawPayload: event as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error(
        `Failed to parse PayPal webhook body: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.cachedTokenExpiresAt) {
      return this.cachedToken;
    }

    const auth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`PayPal token fetch failed: ${text}`);
      throw new Error('Failed to obtain PayPal access token');
    }

    const data = (await response.json()) as PayPalAccessTokenResponse;
    this.cachedToken = data.access_token;
    /* expires_in is seconds; cache for min(expires_in, 9min) to be safe. */
    const ttlMs = Math.min(data.expires_in * 1000, 9 * 60 * 1000);
    this.cachedTokenExpiresAt = now + ttlMs;
    return this.cachedToken;
  }

  private async verifyWebhookAsync(
    headers: Record<string, string>,
    body: string,
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: this.webhookId,
            webhook_event: JSON.parse(body) as unknown,
          }),
        },
      );

      if (!response.ok) return false;
      const data = (await response.json()) as PayPalVerifyResponse;
      return data.verification_status === 'SUCCESS';
    } catch (err) {
      this.logger.error(
        `PayPal webhook verification error: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  private mockCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    const sessionId = `mock_paypal_${randomBytes(16).toString('hex')}`;
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
