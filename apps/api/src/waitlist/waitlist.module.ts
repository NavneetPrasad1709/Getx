import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WaitlistController } from './waitlist.controller';

@Module({
  imports: [AuditModule],
  controllers: [WaitlistController],
})
export class WaitlistModule {}
