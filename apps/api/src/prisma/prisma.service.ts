import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@getx/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Explicitly pass DATABASE_URL so Prisma uses the value resolved by
    // NestJS ConfigModule, not the auto-loaded packages/database/.env value
    // (Prisma loads that file on import, before ConfigModule runs).
    super({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }

  onModuleInit(): void {
    /* Connect in the BACKGROUND — never block (or fail) NestJS bootstrap on the
       database. Awaiting $connect() here meant a slow/unreachable DB at boot
       hung the app before app.listen(), so Railway's healthcheck never got a
       response and every deploy was rolled back. Prisma also connects lazily on
       the first query, so this is just an eager warm-up. */
    this.$connect()
      .then(() => this.logger.log('Prisma connected to database'))
      .catch((err) =>
        this.logger.error(
          'Prisma initial connect failed (will retry on first query)',
          err as Error,
        ),
      );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
