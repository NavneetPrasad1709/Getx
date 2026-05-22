export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  expiresAt: Date;
}

export interface CheckoutOptions {
  orderId: string;
  amount: number; // in USD cents
  currency: string;
  buyerEmail: string;
  buyerName: string;
  itemTitle: string;
  itemDescription: string;
  successUrl: string;
  cancelUrl: string;
}

export interface RefundOptions {
  transactionId: string;
  amount?: number;
  reason: string;
}

export interface WebhookEvent {
  type:
    | 'checkout.completed'
    | 'payment.failed'
    | 'refund.completed'
    | 'unknown';
  externalId: string;
  amount?: number;
  currency?: string;
  /* Tax surfaced from provider (Stripe Tax / Paddle automatic tax /
     Razorpay GST). Stored on Order.taxAmount for receipts/audits. */
  taxAmount?: number;
  taxBreakdown?: {
    tax?: number;
    discount?: number;
    shipping?: number;
  };
  metadata: Record<string, string>;
  rawPayload: Record<string, unknown>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
}

/* Stripe is the only real checkout provider. `mock` stays as a dev-only
   fallback when STRIPE_SECRET_KEY is unset — production refuses the
   mock path (see PaymentsService.resolveProvider). */
export type ProviderName = 'stripe' | 'mock';

/* Maps each frontend/business provider name to the Prisma
   PaymentProvider enum value persisted on Order.paymentProvider. */
export const PROVIDER_TO_PRISMA: Record<ProviderName, string | null> = {
  stripe: 'STRIPE',
  mock: null,
};

export interface PaymentProvider {
  readonly name: ProviderName;
  createCheckout(opts: CheckoutOptions): Promise<CheckoutSession>;
  refund(opts: RefundOptions): Promise<RefundResult>;
  /* parseWebhook is async because PayPal's signature verification calls
     PayPal's verify endpoint over HTTPS — making the contract Promise-
     returning closes the fire-and-forget gap where an unverified PayPal
     event could be dispatched to the order state machine. Other
     providers still verify synchronously via HMAC and simply wrap the
     return in a resolved promise. */
  parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): Promise<WebhookEvent | null>;
}
