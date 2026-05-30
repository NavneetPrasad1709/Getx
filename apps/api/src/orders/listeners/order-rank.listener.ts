import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RankService } from '../../rank/rank.service';
import { ORDER_EVENTS, OrderReleasedEvent } from '../order.events';

/**
 * Awards XP to both buyer and seller after escrow release.
 * 10 XP per $1 of buyerTotal, capped at 1000 per side per order.
 * Runs async outside the payment tx.
 */
@Injectable()
export class OrderRankListener {
  private readonly logger = new Logger(OrderRankListener.name);

  constructor(
    private prisma: PrismaService,
    private rank: RankService,
  ) {}

  @OnEvent(ORDER_EVENTS.RELEASED, { async: true })
  async handleOrderReleased(event: OrderReleasedEvent): Promise<void> {
    const xp = Math.min(1000, Math.floor(event.buyerTotal) * 10);
    if (xp <= 0) return;

    try {
      await Promise.all([
        this.rank.earnXp(this.prisma, event.buyerId, xp),
        this.rank.earnXp(this.prisma, event.sellerId, xp),
      ]);
    } catch (err) {
      this.logger.error(`XP earn failed for order ${event.orderNumber}`, err as Error);
    }
  }
}
