import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { PaddlePaymentProvider } from './providers/paddle.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider, PaddlePaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
