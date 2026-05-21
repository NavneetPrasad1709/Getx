import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NotificationType, Prisma } from '@getx/database';
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
      /* Dedupe gate — if the caller supplied a key, look up a prior
         notification with the same (userId, type, metadata.dedupeKey)
         and short-circuit. The lookup uses a JSON-path predicate; not
         the fastest, but fine for the low-frequency callers (order
         lifecycle, dispute, payout) that opt in. */
      if (params.dedupeKey) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: params.userId,
            type: params.type,
            metadata: {
              path: ['dedupeKey'],
              equals: params.dedupeKey,
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

      /* Merge dedupeKey into the persisted metadata so the next
         lookup can find it. metadata is JSON-valued so we only spread
         when the caller passed a plain object (the typical case);
         primitives / arrays are wrapped under a `value` key alongside
         dedupeKey instead of being silently dropped. */
      const persistedMetadata: Prisma.InputJsonValue | undefined = (() => {
        if (!params.dedupeKey) return params.metadata;
        const base = params.metadata;
        const isPlainObject =
          base !== null &&
          base !== undefined &&
          typeof base === 'object' &&
          !Array.isArray(base);
        if (isPlainObject) {
          return {
            ...(base as Record<string, Prisma.InputJsonValue>),
            dedupeKey: params.dedupeKey,
          };
        }
        if (base === undefined || base === null) {
          return { dedupeKey: params.dedupeKey };
        }
        return { value: base, dedupeKey: params.dedupeKey };
      })();

      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message ?? '',
          link: params.link,
          imageUrl: params.imageUrl,
          metadata: persistedMetadata,
        },
        select: LIST_SELECT,
      });

      if (params.sendEmail) {
        // Fire-and-forget — don't block the caller.
        void this.deliverEmail(notification.id).catch((err) => {
          this.logger.warn(
            `Notification email failed for ${notification.id}: ${err instanceof Error ? err.message : err}`,
          );
        });
      }

      return notification;
    } catch (err) {
      this.logger.error(
        `Failed to create notification: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private async deliverEmail(notificationId: string): Promise<void> {
    const n = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: { email: true, name: true, emailNotifications: true },
        },
      },
    });
    if (!n) return;

    // Respect user's notification preferences.
    if (!n.user.emailNotifications) {
      this.logger.debug(`Email skipped — user has emailNotifications=false`);
      return;
    }

    const webUrl = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');
    const actionUrl = n.link ? `${webUrl}${n.link}` : webUrl;

    try {
      await this.mail.sendNotification({
        to: n.user.email,
        subject: n.title,
        title: n.title,
        body: n.message || undefined,
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

  async listMyNotifications(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: LIST_SELECT,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
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

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
