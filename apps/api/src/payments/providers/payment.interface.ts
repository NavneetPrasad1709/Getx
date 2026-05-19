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

export type ProviderName =
  | 'stripe'
  | 'paypal'
  | 'razorpay'
  | 'paddle'
  | 'mock';

/* Maps each frontend/business provider name to the Prisma
   PaymentProvider enum value persisted on Order.paymentProvider. */
export const PROVIDER_TO_PRISMA: Record<ProviderName, string | null> = {
  stripe: 'STRIPE',
  paypal: 'PAYPAL',
  razorpay: 'RAZORPAY',
  paddle: 'PADDLE',
  mock: null,
};

export interface PaymentProvider {
  readonly name: ProviderName;
  createCheckout(opts: CheckoutOptions): Promise<CheckoutSession>;
  refund(opts: RefundOptions): Promise<RefundResult>;
  parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): WebhookEvent | null;
}
