import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@getx/database';
import { NotificationType } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { firstOrigin } from '../common/config-helpers';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  imageUrl?: string;
  metadata?: Prisma.InputJsonValue;
  /** Send transactional email in addition to in-app. */
  sendEmail?: boolean;
  /**
   * Optional caller-supplied idempotency key. When set, a prior
   * notification with the same (userId, type, dedupeKey) is returned
   * instead of inserting a duplicate. Pattern: `order:<id>:paid`,
   * `dispute:<id>:opened`, etc. Keep it short and stable.
   *
   * Most upstream paths (webhook dispatch table, order status guards)
   * are already idempotent so the dedupe rarely fires — it's a final
   * safety net for the "webhook retried after long delay" case.
   */
  dedupeKey?: string;
}

const LIST_SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,
  link: true,
  imageUrl: true,
  metadata: true,
  read: true,
  readAt: true,
  emailSent: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationListItem = Prisma.NotificationGetPayload<{
  select: typeof LIST_SELECT;
}>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  /**
   * Persist a notification + optionally fire a transactional email.
   * Always swallows errors so the caller's main flow (order, payment, chat)
   * never fails because notifications failed.
   */
  async create(
    params: CreateNotificationParams,
  ): Promise<NotificationListItem | null> {
    try {
      // RES-HIGH-051: use the dedicated dedupeKey column — O(1) unique index
      // lookup replaces the O(n) JSON-path scan on metadata
      if (params.dedupeKey) {
        const existing = await this.prisma.notification.findUnique({
          where: {
            Notification_userId_dedupeKey_unique: {
              userId: params.userId,
              dedupeKey: params.dedupeKey,
            },
          },
          select: LIST_SELECT,
        });
        if (existing) {
          this.logger.debug(
            `Notification dedupe hit: ${params.type}/${params.dedupeKey}`,
          );
          return existing;
        }
      }

      // Join user at create time so deliverEmail doesn't need a second query.
      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message ?? '',
          link: params.link,
          imageUrl: params.imageUrl,
          dedupeKey: params.dedupeKey ?? null,
          metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
        select: {
          ...LIST_SELECT,
          // Extra fields needed only for email delivery — excluded from the
          // returned public shape via the spread below.
          user: { select: { email: true, name: true, emailNotifications: true } },
        },
      });

      if (params.sendEmail) {
        const { user, ...notificationRow } = notification;
        // Fire-and-forget — don't block the caller.
        void this.deliverEmail(notificationRow.id, user, notificationRow).catch((err) => {
          this.logger.warn(
            `Notification email failed for ${notificationRow.id}: ${err instanceof Error ? err.message : err}`,
          );
        });
        // Return only the public shape (without the joined user).
        return notificationRow as NotificationListItem;
      }

      const { user: _u, ...notificationRow } = notification;
      return notificationRow as NotificationListItem;
    } catch (err) {
      this.logger.error(
        `Failed to create notification: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  // Accepts pre-fetched user data to eliminate the N+1 query that the old
  // version incurred by re-fetching the notification + user after create.
  private async deliverEmail(
    notificationId: string,
    user: { email: string; name: string | null; emailNotifications: boolean },
    notification: { title: string; message: string; link: string | null },
  ): Promise<void> {
    // Respect user's notification preferences.
    if (!user.emailNotifications) {
      this.logger.debug(`Email skipped — user has emailNotifications=false`);
      return;
    }

    const webUrl = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');
    const actionUrl = notification.link ? `${webUrl}${notification.link}` : webUrl;

    try {
      await this.mail.sendNotification({
        to: user.email,
        subject: notification.title,
        title: notification.title,
        body: notification.message || undefined,
        actionUrl,
        actionLabel: 'View on GETX',
      });
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { emailSent: true },
      });
    } catch (err) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { emailError: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async listMyNotifications(
    userId: string,
    page = 1,
    limit = 20,
    types?: NotificationType[],
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);

    // Optional type filter — the seller app passes only seller-relevant
    // types so its bell isn't flooded with buyer-side notifications.
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(types && types.length ? { type: { in: types } } : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: LIST_SELECT,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, read: false } }),
    ]);

    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true, read: true },
    });
    if (!notification) throw new NotFoundException();
    if (notification.userId !== userId) throw new ForbiddenException();

    if (notification.read) return { success: true };

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { success: true, updated: result.count };
  }

  async getUnreadCount(userId: string, types?: NotificationType[]) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
        ...(types && types.length ? { type: { in: types } } : {}),
      },
    });
  }
}
