import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RankService } from './rank.service';

@Module({
  imports: [NotificationsModule],
  providers: [RankService],
  exports: [RankService],
})
export class RankModule {}
