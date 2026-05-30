import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomRequestsController } from './custom-requests.controller';
import { CustomRequestsService } from './custom-requests.service';

@Module({
  imports: [AuthModule],  // provides OptionalJwtAuthGuard
  controllers: [CustomRequestsController],
  providers: [CustomRequestsService],
  exports: [CustomRequestsService],
})
export class CustomRequestsModule {}
