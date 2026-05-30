/**
 * Domain events emitted after an order's escrow is successfully released.
 * Listeners run asynchronously outside the critical $transaction so a
 * failure in cashback/loyalty/XP never rolls back the seller's payment.
 */
export const ORDER_EVENTS = {
  RELEASED: 'order.released',
} as const;

export class OrderReleasedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly buyerId: string,
    public readonly sellerId: string,
    public readonly buyerTotal: number,
    public readonly currency: string,
    public readonly trigger: 'manual' | 'auto',
  ) {}
}
