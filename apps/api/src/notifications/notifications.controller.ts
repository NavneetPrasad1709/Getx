import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationType } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  NotificationsService,
  type NotificationListItem,
} from './notifications.service';

const VALID_NOTIFICATION_TYPES = new Set<string>(
  Object.values(NotificationType),
);

/* Parse a comma-separated `?types=A,B` query into a validated enum list.
   Unknown values are dropped so a bad param can't trigger a Prisma
   validation error; an empty/absent param returns undefined (no filter). */
function parseTypes(raw?: string): NotificationType[] | undefined {
  if (!raw) return undefined;
  const types = raw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is NotificationType => VALID_NOTIFICATION_TYPES.has(t));
  return types.length ? types : undefined;
}

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
    @Query('types') types?: string,
  ): Promise<NotificationListResponse> {
    return this.notifs.listMyNotifications(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      parseTypes(types),
    );
  }

  @Get('me/unread-count')
  async unreadCount(
    @CurrentUser('id') userId: string,
    @Query('types') types?: string,
  ) {
    return { count: await this.notifs.getUnreadCount(userId, parseTypes(types)) };
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
