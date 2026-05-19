import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { SumsubWebhookController } from './sumsub.controller';

@Module({
  imports: [AccountModule],
  controllers: [SumsubWebhookController],
})
export class WebhooksModule {}
