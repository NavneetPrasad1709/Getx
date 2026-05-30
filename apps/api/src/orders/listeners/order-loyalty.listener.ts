import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyService } from '../../loyalty/loyalty.service';
import { ORDER_EVENTS, OrderReleasedEvent } from '../order.events';

/**
 * Awards loyalty points to the buyer after escrow release.
 * 1 point per $1 of buyerTotal, capped at 1000 per order to prevent
 * farming via inflated test orders. Runs async outside the payment tx.
 */
@Injectable()
export class OrderLoyaltyListener {
  private readonly logger = new Logger(OrderLoyaltyListener.name);

  constructor(
    private prisma: PrismaService,
    private loyalty: LoyaltyService,
  ) {}

  @OnEvent(ORDER_EVENTS.RELEASED, { async: true })
  async handleOrderReleased(event: OrderReleasedEvent): Promise<void> {
    const points = Math.min(1000, Math.floor(event.buyerTotal));
    if (points <= 0) return;

    try {
      await this.loyalty.earn(this.prisma, {
        userId: event.buyerId,
        type: 'EARNED_PURCHASE',
        points,
        description: `${points} pts from order ${event.orderNumber}`,
        orderId: event.orderId,
      });
    } catch (err) {
      this.logger.error(`Loyalty earn failed for order ${event.orderNumber}`, err as Error);
    }
  }
}
