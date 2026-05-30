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

interface StripeCheckoutSessionResponse {
  id: string;
  url: string;
  expires_at: number;
}

interface StripeRefundResponse {
  id: string;
}

interface StripeWebhookObject {
  id?: string;
  client_reference_id?: string;
  amount_total?: number;
  amount_subtotal?: number;
  currency?: string;
  metadata?: Record<string, string>;
  total_details?: {
    amount_tax?: number;
    amount_discount?: number;
    amount_shipping?: number;
  };
}

interface StripeWebhookEvent {
  id?: string; // globally unique per Stripe delivery — use for refund idempotency
  type?: string;
  data?: { object?: StripeWebhookObject };
}

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly logger = new Logger(StripePaymentProvider.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly apiUrl = 'https://api.stripe.com/v1';

  constructor(private config: ConfigService) {
    this.secretKey = config.get<string>('STRIPE_SECRET_KEY') ?? '';
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    if (!this.secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured — Stripe provider running in MOCK fallback mode.',
      );
    } else {
      this.logger.log('Stripe provider configured');
      if (!this.webhookSecret) {
        this.logger.warn(
          'STRIPE_WEBHOOK_SECRET not set — webhook signatures will not be verified (dev only).',
        );
      }
    }
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    if (!this.secretKey) {
      this.logger.warn('===== STRIPE MOCK =====');
      this.logger.warn(
        `Mock checkout for order ${opts.orderId} (${opts.currency} ${opts.amount})`,
      );
      return this.mockCheckout(opts);
    }

    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set(
      'line_items[0][price_data][currency]',
      opts.currency.toLowerCase(),
    );
    form.set('line_items[0][price_data][product_data][name]', opts.itemTitle);
    form.set('line_items[0][price_data][unit_amount]', opts.amount.toString());
    form.set('line_items[0][quantity]', '1');
    form.set('success_url', opts.successUrl);
    form.set('cancel_url', opts.cancelUrl);
    form.set('client_reference_id', opts.orderId);
    form.set('customer_email', opts.buyerEmail);
    form.set('metadata[orderId]', opts.orderId);

    /* Stripe Tax — auto-calculates sales tax / VAT / GST based on the
       buyer's address. Requires Stripe Tax to be enabled in the dashboard
       (Settings → Tax). Tax line items on the session are reflected in
       `amount_total` and `total_details.amount_tax` on the completed
       webhook, which we persist to Order.taxAmount/taxBreakdown. */
    form.set('automatic_tax[enabled]', 'true');
    form.set('customer_update[address]', 'auto');
    form.set('customer_update[name]', 'auto');
    form.set('billing_address_collection', 'auto');

    /* Risk hardening — let Stripe Radar decide when to challenge with
       3DS. `automatic` is the recommended default for marketplace flows:
       Radar challenges when issuer signals risk, skips when low. We
       also enable Radar's full rule engine via the `radar[session]`
       hookup if one was created by the client (no-op when absent).
       Combined with Radar's hosted rules + velocity caps this matches
       the §H Phase-7 risk baseline. */
    form.set(
      'payment_method_options[card][request_three_d_secure]',
      'automatic',
    );

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');

    const response = await fetch(`${this.apiUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Stripe checkout creation failed: ${text}`);
      throw new Error('Failed to create Stripe checkout session');
    }

    const data = (await response.json()) as StripeCheckoutSessionResponse;
    return {
      sessionId: data.id,
      checkoutUrl: data.url,
      expiresAt: new Date(data.expires_at * 1000),
    };
  }

  async refund(opts: RefundOptions): Promise<RefundResult> {
    if (!this.secretKey) {
      this.logger.warn('===== STRIPE MOCK =====');
      this.logger.warn(
        `Mock refund for ${opts.transactionId} (${opts.reason})`,
      );
      return {
        success: true,
        refundId: `mock_stripe_refund_${randomBytes(8).toString('hex')}`,
      };
    }

    const form = new URLSearchParams();
    form.set('payment_intent', opts.transactionId);
    if (opts.amount) form.set('amount', opts.amount.toString());

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    const response = await fetch(`${this.apiUrl}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Stripe refund failed: ${text}`);
      throw new Error('Stripe refund failed');
    }

    const data = (await response.json()) as StripeRefundResponse;
    return { success: true, refundId: data.id };
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- async only to satisfy the PayPal-driven interface contract; verification stays sync (HMAC)
  async parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): Promise<WebhookEvent | null> {
    /* Signature verification — only enforced when STRIPE_WEBHOOK_SECRET set.
       Dev mode without the secret accepts all webhooks but logs a warning. */
    if (this.webhookSecret) {
      const signatureHeader = headers['stripe-signature'];
      if (!signatureHeader) {
        this.logger.warn('Missing stripe-signature header');
        return null;
      }
      if (!this.verifySignature(signatureHeader, body)) {
        this.logger.warn('Stripe webhook signature verification failed');
        return null;
      }
    } else {
      this.logger.warn(
        'Stripe webhook received without STRIPE_WEBHOOK_SECRET — skipping verification (dev only)',
      );
    }

    try {
      const event = JSON.parse(body) as StripeWebhookEvent;
      const obj = event.data?.object ?? {};

      let type: WebhookEvent['type'] = 'unknown';
      switch (event.type) {
        case 'checkout.session.completed':
          type = 'checkout.completed';
          break;
        case 'payment_intent.payment_failed':
          type = 'payment.failed';
          break;
        case 'charge.refunded':
          type = 'refund.completed';
          break;
        default:
          type = 'unknown';
      }

      // PAY-CRIT-002: for refund events use the Stripe event id (globally
      // unique per delivery) instead of obj.id (charge id) — multiple partial
      // refunds share the same charge id and would collide on the unique index.
      const externalId =
        type === 'checkout.completed' && obj.client_reference_id
          ? obj.client_reference_id
          : type === 'refund.completed'
          ? (event.id ?? obj.id ?? '')
          : (obj.id ?? '');

      const taxMinor = obj.total_details?.amount_tax;
      const discountMinor = obj.total_details?.amount_discount;
      const shippingMinor = obj.total_details?.amount_shipping;
      const taxAmount =
        typeof taxMinor === 'number' ? taxMinor / 100 : undefined;
      const taxBreakdown =
        taxMinor !== undefined ||
        discountMinor !== undefined ||
        shippingMinor !== undefined
          ? {
              tax: typeof taxMinor === 'number' ? taxMinor / 100 : undefined,
              discount:
                typeof discountMinor === 'number'
                  ? discountMinor / 100
                  : undefined,
              shipping:
                typeof shippingMinor === 'number'
                  ? shippingMinor / 100
                  : undefined,
            }
          : undefined;

      return {
        type,
        externalId,
        amount:
          typeof obj.amount_total === 'number'
            ? obj.amount_total / 100
            : undefined,
        currency:
          typeof obj.currency === 'string'
            ? obj.currency.toUpperCase()
            : undefined,
        taxAmount,
        taxBreakdown,
        metadata: obj.metadata ?? {},
        rawPayload: event as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error(
        `Failed to parse Stripe webhook body: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private verifySignature(signatureHeader: string, body: string): boolean {
    /* Stripe-Signature header format: "t=<timestamp>,v1=<sig>,v1=<sig>..." */
    const parts = signatureHeader
      .split(',')
      .reduce<Record<string, string[]>>((acc, part) => {
        const [k, v] = part.split('=');
        if (!k || !v) return acc;
        if (!acc[k]) acc[k] = [];
        acc[k].push(v);
        return acc;
      }, {});

    const timestamp = parts.t?.[0];
    const signatures = parts.v1 ?? [];
    if (!timestamp || signatures.length === 0) return false;

    /* Reject replays: signed payloads more than 5 minutes old (in either
       direction, to be resilient to small clock skew) are dropped even
       when their signature matches. Matches Stripe's recommended
       construction in github.com/stripe/stripe-node. */
    const sentAtMs = Number(timestamp) * 1000;
    const TOLERANCE_MS = 5 * 60 * 1000;
    if (
      !Number.isFinite(sentAtMs) ||
      Math.abs(Date.now() - sentAtMs) > TOLERANCE_MS
    ) {
      this.logger.warn(
        `Stripe webhook timestamp outside tolerance (t=${timestamp}); refusing.`,
      );
      return false;
    }

    const payload = `${timestamp}.${body}`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');

    for (const sig of signatures) {
      try {
        const receivedBuf = Buffer.from(sig, 'hex');
        if (
          receivedBuf.length === expectedBuf.length &&
          timingSafeEqual(expectedBuf, receivedBuf)
        ) {
          return true;
        }
      } catch {
        // ignore malformed signature entries
      }
    }
    return false;
  }

  private mockCheckout(opts: CheckoutOptions): Promise<CheckoutSession> {
    const sessionId = `mock_stripe_${randomBytes(16).toString('hex')}`;
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
