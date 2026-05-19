import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { WalletTransaction } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { ApplyWalletSchema, WithdrawSchema } from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  myWallet(@CurrentUser('id') userId: string): Promise<{
    balance: number;
    pendingEarnings: number;
    sellerWallet: number;
    totalEarned: number;
    totalSpent: number;
    ledger: WalletTransaction[];
  }> {
    return this.wallet.getMyWallet(userId);
  }

  @Post('apply')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  apply(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ walletApplied: number; newBalance: number; chargeable: number }> {
    const dto = ApplyWalletSchema.parse(body);
    return this.wallet.applyToOrder(userId, dto);
  }

  @Post('withdraw')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  withdraw(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ id: string }> {
    const dto = WithdrawSchema.parse(body);
    return this.wallet.withdraw(userId, dto);
  }
}
