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
  metadata: Record<string, string>;
  rawPayload: Record<string, unknown>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
}

export type ProviderName = 'paddle' | 'mock';

export interface PaymentProvider {
  readonly name: ProviderName;
  createCheckout(opts: CheckoutOptions): Promise<CheckoutSession>;
  refund(opts: RefundOptions): Promise<RefundResult>;
  parseWebhook(
    headers: Record<string, string>,
    body: string,
  ): WebhookEvent | null;
}
