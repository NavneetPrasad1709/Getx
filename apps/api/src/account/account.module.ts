import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AccountAnonymizeCron } from './account-anonymize.cron';

@Module({
  imports: [AuditModule, LoyaltyModule],
  providers: [AccountService, AccountAnonymizeCron],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
