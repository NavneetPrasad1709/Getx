import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    PrismaModule,
    AuditModule,
    MailModule,
    AuthModule,
    GamesModule,
    ListingsModule,
    CustomRequestsModule,
    UploadsModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
    ConversationsModule,
    NotificationsModule,
    ReviewsModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
