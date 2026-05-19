import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PayoutsController } from './payouts.controller';
import { StripeConnectService } from './stripe-connect.service';

@Module({
  imports: [AuditModule],
  controllers: [PayoutsController],
  providers: [StripeConnectService],
  exports: [StripeConnectService],
})
export class PayoutsModule {}
