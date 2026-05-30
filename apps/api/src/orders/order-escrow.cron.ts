import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';
import { withCronLock } from '../common/cron-lock';

/**
 * Hourly escrow auto-release sweeper — extracted from OrdersService to keep
 * the domain service focused on request handling, not job scheduling.
 *
 * Without this cron, every PAID order sits in HELD escrow until the buyer
 * manually confirms. The 3-day autoReleaseAt timestamp is the contract;
 * this is what enforces it. Idempotent: releaseToSeller no-ops when
 * escrowStatus is already RELEASED.
 */
@Injectable()
export class OrderEscrowCron {
  private readonly logger = new Logger(OrderEscrowCron.name);

  constructor(private orders: OrdersService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'escrowAutoRelease' })
  async releaseExpiredEscrow(): Promise<{ released: number } | undefined> {
    // Lock TTL > worst-case sweep time; another replica skips this tick.
    return withCronLock('escrowAutoRelease', 10 * 60 * 1000, async () => {
      const result = await this.orders.sweepExpiredEscrow();
      this.logger.log(`Escrow sweep complete — released: ${result.released}`);
      return result;
    });
  }
}
