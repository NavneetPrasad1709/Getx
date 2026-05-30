import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUserService } from './services/admin-user.service';
import { AdminOrderService } from './services/admin-order.service';
import { AdminContentService } from './services/admin-content.service';
import { AdminFinanceService } from './services/admin-finance.service';

@Module({
  imports: [PaymentsModule, NotificationsModule, ConversationsModule],
  controllers: [AdminController],
  providers: [
    AdminDashboardService,
    AdminUserService,
    AdminOrderService,
    AdminContentService,
    AdminFinanceService,
  ],
})
export class AdminModule {}
