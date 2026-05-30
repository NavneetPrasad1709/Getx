import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RankModule } from '../rank/rank.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEscrowCron } from './order-escrow.cron';
import { OrderWalletListener } from './listeners/order-wallet.listener';
import { OrderLoyaltyListener } from './listeners/order-loyalty.listener';
import { OrderRankListener } from './listeners/order-rank.listener';

@Module({
  imports: [
    ConversationsModule,
    NotificationsModule,
    WalletModule,
    LoyaltyModule,
    RankModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderEscrowCron,
    // Domain event listeners — each handles one side-effect of order completion.
    OrderWalletListener,
    OrderLoyaltyListener,
    OrderRankListener,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
