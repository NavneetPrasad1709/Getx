import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { StripePaymentProvider } from './providers/stripe.provider';

@Module({
  imports: [ConversationsModule, NotificationsModule, LoyaltyModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider, StripePaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
