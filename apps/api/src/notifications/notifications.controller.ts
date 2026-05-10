import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  NotificationsService,
  type NotificationListItem,
} from './notifications.service';

interface NotificationListResponse {
  data: NotificationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notifs: NotificationsService) {}

  @Get('me/list')
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationListResponse> {
    return this.notifs.listMyNotifications(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('me/unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    return { count: await this.notifs.getUnreadCount(userId) };
  }

  @Patch('me/read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notifs.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notifs.markAsRead(userId, id);
  }
}
