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

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database');
    } catch (err) {
      this.logger.error('Prisma failed to connect', err as Error);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
