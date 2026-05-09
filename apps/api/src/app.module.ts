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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
