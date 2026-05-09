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
