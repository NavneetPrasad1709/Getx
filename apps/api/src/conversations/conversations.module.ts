import {
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { SocketRateLimiter } from './socket-rate-limiter';

const BUCKET_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatGateway, SocketRateLimiter],
  exports: [ConversationsService, ChatGateway],
})
export class ConversationsModule implements OnModuleInit, OnModuleDestroy {
  private cleanupHandle?: NodeJS.Timeout;

  constructor(private rateLimiter: SocketRateLimiter) {}

  onModuleInit() {
    this.cleanupHandle = setInterval(
      () => this.rateLimiter.cleanup(),
      BUCKET_CLEANUP_INTERVAL_MS,
    );
    // Don't keep the event loop alive on test/CLI runs.
    this.cleanupHandle.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupHandle) clearInterval(this.cleanupHandle);
  }
}
