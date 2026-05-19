import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { ListingsModule } from './listings/listings.module';
import { CustomRequestsModule } from './custom-requests/custom-requests.module';
import { UploadsModule } from './uploads/uploads.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ConversationsModule } from './conversations/conversations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { WalletModule } from './wallet/wallet.module';
import { AccountModule } from './account/account.module';
import { AddressesModule } from './addresses/addresses.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ReferralsModule } from './referrals/referrals.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { RankModule } from './rank/rank.module';
import { PayoutsModule } from './payouts/payouts.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    MailModule,
    AuthModule,
    GamesModule,
    ListingsModule,
    SavedSearchesModule,
    CustomRequestsModule,
    UploadsModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
    WalletModule,
    ConversationsModule,
    NotificationsModule,
    ReviewsModule,
    UsersModule,
    AccountModule,
    AddressesModule,
    PaymentMethodsModule,
    WebhooksModule,
    ReferralsModule,
    LoyaltyModule,
    RankModule,
    PayoutsModule,
    WaitlistModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
