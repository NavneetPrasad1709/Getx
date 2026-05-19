import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { LoyaltyTransaction } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplyLoyaltySchema } from './dto/loyalty.dto';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  @Get('me')
  myLoyalty(@CurrentUser('id') userId: string): Promise<{
    balance: number;
    lifetime: number;
    nextExpiry: { points: number; expiresAt: Date } | null;
    ledger: LoyaltyTransaction[];
  }> {
    return this.loyalty.getMyLoyalty(userId);
  }

  /* Preview the maximum the buyer can redeem on a given pending order,
     and surface whether it's blocked by a wallet credit already on the
     same order. Read-only — UI calls this when rendering the toggle. */
  @Get('preview/:orderId')
  preview(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ): ReturnType<LoyaltyService['previewForOrder']> {
    return this.loyalty.previewForOrder(userId, orderId);
  }

  /* Apply N points to a PENDING order. Throws on mutex with wallet,
     non-PENDING status, or insufficient balance. Rate-limited so a
     compromised session can't drain the ledger via spam. */
  @Post('apply')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  apply(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): ReturnType<LoyaltyService['applyToOrder']> {
    const dto = ApplyLoyaltySchema.parse(body);
    return this.loyalty.applyToOrder(userId, dto.orderId, dto.points);
  }

  /* Remove points from a still-PENDING order. Restores balance + clears
     loyaltyUsdApplied so chargeable recalculates. Idempotent. */
  @Delete('apply/:orderId')
  remove(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ): Promise<{ success: true }> {
    return this.loyalty.removeFromOrder(userId, orderId);
  }
}
