import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { PaddlePaymentProvider } from './providers/paddle.provider';

@Module({
  imports: [ConversationsModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider, PaddlePaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
