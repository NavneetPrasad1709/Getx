import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { ORDER_EVENTS, OrderReleasedEvent } from '../order.events';

/**
 * Credits 1% cashback to the buyer's GETX Coin wallet after escrow release.
 * Runs outside the seller-payment transaction so a cashback DB failure never
 * rolls back the seller's earned funds.
 */
@Injectable()
export class OrderWalletListener {
  private readonly logger = new Logger(OrderWalletListener.name);

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  @OnEvent(ORDER_EVENTS.RELEASED, { async: true })
  async handleOrderReleased(event: OrderReleasedEvent): Promise<void> {
    try {
      // creditCashback expects a Prisma transaction client; we pass the
      // singleton directly — each write is atomic at the statement level.
      const cashback = await this.wallet.creditCashback(this.prisma, {
        buyerId: event.buyerId,
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        buyerTotal: event.buyerTotal,
        currency: event.currency,
      });
      if (cashback > 0) {
        this.logger.log(`Cashback $${cashback.toFixed(2)} credited to buyer ${event.buyerId} for order ${event.orderNumber}`);
      }
    } catch (err) {
      this.logger.error(`Cashback failed for order ${event.orderNumber}`, err as Error);
      // Non-fatal: buyer missed cashback but seller is already paid.
    }
  }
}
