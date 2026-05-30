import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { getRedisClient } from './common/redis.factory';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';
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
    // Global event bus — listeners in OrdersModule subscribe to order.released
    // to run cashback/loyalty/XP side-effects outside the payment transaction.
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    ScheduleModule.forRoot(),
    // RES-HIGH-009: global rate-limiter — 60 req/60s per IP (tightened from
    // 100). Per-route overrides via @Throttle() in controllers.
    // ARCH-004: when REDIS_URL is set the counter lives in Redis so the limit
    // is enforced across every replica; without it, the in-memory store is the
    // single-replica/dev fallback. forRootAsync (not forRoot) so the factory
    // runs AFTER ConfigModule has loaded .env into process.env.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const redis = redisUrl ? getRedisClient() : null;
        return {
          throttlers: [{ ttl: 60_000, limit: 60 }],
          ...(redis ? { storage: new RedisThrottlerStorage(redis) } : {}),
        };
      },
    }),
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
