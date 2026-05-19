import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [AuditModule, LoyaltyModule],
  providers: [AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
