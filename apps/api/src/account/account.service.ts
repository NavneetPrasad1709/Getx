import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { DataExportRequest, KycDocument } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  SubmitKycDto,
  UpdateNotificationsDto,
  UpdateProfileDto,
} from './dto/account.dto';

const SUMSUB_LEVEL = 'basic-kyc-level';
const SUMSUB_BASE = 'https://api.sumsub.com';

interface SumsubReviewedEvent {
  applicantId: string;
  externalUserId?: string;
  type: string; // applicantReviewed | applicantPending | etc
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
    rejectLabels?: string[];
  };
}

/* AccountService — covers settings actions that don't fit into a more
   specific module: password change, notification prefs, KYC submission,
   data-export requests, and soft account delete. */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    private loyalty: LoyaltyService,
  ) {}

  /* Sumsub-issued short-lived access token for the buyer's WebSDK iframe.
     Non-IN users get this; IN users continue with the existing Aadhaar form.
     Falls back to a mock token in dev (no SUMSUB_APP_TOKEN configured) so
     the frontend flow stays testable. */
  async getSumsubAccessToken(
    userId: string,
  ): Promise<{ token: string; userId: string; mock: boolean }> {
    const appToken = this.config.get<string>('SUMSUB_APP_TOKEN');
    const secret = this.config.get<string>('SUMSUB_SECRET_KEY');

    /* Ensure sumsubExternalUserId is stable per user. */
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, sumsubExternalUserId: true, country: true },
    });
    if (!user) throw new NotFoundException();

    let externalUserId = user.sumsubExternalUserId;
    if (!externalUserId) {
      externalUserId = `getx-${userId}`;
      await this.prisma.user.update({
        where: { id: userId },
        data: { sumsubExternalUserId: externalUserId },
      });
    }

    if (!appToken || !secret) {
      this.logger.warn(
        '===== SUMSUB MOCK ===== SUMSUB_APP_TOKEN missing; returning mock token. Set it in production.',
      );
      return {
        token: `mock_${randomBytes(12).toString('hex')}`,
        userId: externalUserId,
        mock: true,
      };
    }

    /* Real Sumsub call — HMAC-signed per their docs. */
    const ts = Math.floor(Date.now() / 1000);
    const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${SUMSUB_LEVEL}`;
    const signature = createHmac('sha256', secret)
      .update(`${ts}POST${path}`)
      .digest('hex');

    const res = await fetch(`${SUMSUB_BASE}${path}`, {
      method: 'POST',
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': String(ts),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Sumsub token error: ${text}`);
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new BadRequestException('Sumsub returned no token');
    return { token: data.token, userId: externalUserId, mock: false };
  }

  /* Webhook handler — Sumsub posts applicantReviewed events when review
     finishes. Maps GREEN → APPROVED, RED → REJECTED. Signature verified
     by the controller before this is called. */
  async handleSumsubWebhook(event: SumsubReviewedEvent): Promise<void> {
    if (event.type !== 'applicantReviewed' || !event.reviewResult) return;
    const externalUserId = event.externalUserId;
    if (!externalUserId) return;

    /* Recover our internal user id from sumsubExternalUserId. */
    const user = await this.prisma.user.findFirst({
      where: { sumsubExternalUserId: externalUserId },
      select: { id: true },
    });
    if (!user) {
      this.logger.warn(`Sumsub webhook for unknown user: ${externalUserId}`);
      return;
    }

    if (event.reviewResult.reviewAnswer === 'GREEN') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          kycStatus: 'VERIFIED',
          kycVerifiedAt: new Date(),
          kycLevel: 'LEVEL_2',
          isVerified: true,
          sumsubApplicantId: event.applicantId,
        },
      });
    } else if (event.reviewResult.reviewAnswer === 'RED') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          kycStatus: 'REJECTED',
          kycRejectionReason:
            event.reviewResult.rejectLabels?.join(', ') ?? 'Sumsub rejected',
        },
      });
    }
  }

  /* Updates buyer-facing profile fields (bio, avatar, social handles,
     website, timezone). Returns updated public shape.

     Also fires the one-time EARNED_PROFILE_COMPLETE loyalty bonus when
     bio + avatar + at least one social handle land together for the
     first time. The "first time" guard reads the ledger so we never
     need a dedicated flag column. */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<{ success: true; pointsEarned?: number }> {
    /* Build a minimal data patch — only include keys present in DTO. */
    const data: Record<string, unknown> = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.twitterHandle !== undefined) data.twitterHandle = dto.twitterHandle;
    if (dto.discordHandle !== undefined) data.discordHandle = dto.discordHandle;
    if (dto.youtubeHandle !== undefined) data.youtubeHandle = dto.youtubeHandle;
    if (dto.twitchHandle !== undefined) data.twitchHandle = dto.twitchHandle;
    if (dto.preferredLanguages !== undefined) {
      data.preferredLanguages = dto.preferredLanguages;
    }
    if (dto.timezone !== undefined) data.timezone = dto.timezone;

    let pointsEarned = 0;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data });

      /* Re-read the user to evaluate completeness against the merged
         state (existing + just-written). */
      const fresh = await tx.user.findUnique({
        where: { id: userId },
        select: {
          bio: true,
          avatar: true,
          twitterHandle: true,
          discordHandle: true,
          youtubeHandle: true,
          twitchHandle: true,
          website: true,
        },
      });
      if (!fresh) return;

      const hasBio = (fresh.bio?.trim().length ?? 0) >= 20;
      const hasAvatar = !!fresh.avatar && fresh.avatar.length > 0;
      const hasSocial = !!(
        fresh.twitterHandle ||
        fresh.discordHandle ||
        fresh.youtubeHandle ||
        fresh.twitchHandle ||
        fresh.website
      );
      if (!hasBio || !hasAvatar || !hasSocial) return;

      const alreadyAwarded = await tx.loyaltyTransaction.findFirst({
        where: { userId, type: 'EARNED_PROFILE_COMPLETE' },
        select: { id: true },
      });
      if (alreadyAwarded) return;

      pointsEarned = await this.loyalty.earn(tx, {
        userId,
        type: 'EARNED_PROFILE_COMPLETE',
        points: 100,
        description: 'Profile completed — bio, avatar, and socials',
      });
    });

    return pointsEarned > 0
      ? { success: true, pointsEarned }
      : { success: true };
  }

  async getNotificationPrefs(userId: string): Promise<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingOptIn: boolean;
  }> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        marketingOptIn: true,
      },
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  async updateNotificationPrefs(
    userId: string,
    dto: UpdateNotificationsDto,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.emailNotifications !== undefined ? { emailNotifications: dto.emailNotifications } : {}),
        ...(dto.pushNotifications !== undefined ? { pushNotifications: dto.pushNotifications } : {}),
        ...(dto.smsNotifications !== undefined ? { smsNotifications: dto.smsNotifications } : {}),
        ...(dto.marketingOptIn !== undefined ? { marketingOptIn: dto.marketingOptIn } : {}),
      },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ip: string | undefined,
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException();

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new ForbiddenException('Current password is wrong');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);

    /* Invalidate all other refresh tokens — buyer stays logged in on this
       device, every other session is killed. */
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashed,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      userId,
      action: 'auth.password_changed',
      entity: 'User',
      entityId: userId,
      ipAddress: ip,
      severity: 'WARNING',
    });

    return { success: true };
  }

  /* Submits a KycDocument with Aadhaar number (hashed) + selfie. Sets
     User.kycStatus=SUBMITTED so the admin queue picks it up. */
  async submitKyc(userId: string, dto: SubmitKycDto): Promise<KycDocument> {
    const aadhaarHash = createHash('sha256').update(dto.aadhaarNumber).digest('hex');

    /* Reject duplicate aadhaarHash bound to a different user. */
    const collision = await this.prisma.user.findFirst({
      where: { aadhaarHash, id: { not: userId } },
      select: { id: true },
    });
    if (collision) {
      throw new BadRequestException('Aadhaar already linked to another account');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          aadhaarHash,
          kycStatus: 'SUBMITTED',
          kycSubmittedAt: new Date(),
          documentType: 'AADHAAR_CARD',
          documentCountry: 'IN',
        },
      });

      const doc = await tx.kycDocument.create({
        data: {
          userId,
          documentType: 'AADHAAR_CARD',
          documentNumber: aadhaarHash,
          frontImageUrl: dto.frontImageUrl,
          backImageUrl: dto.backImageUrl ?? null,
          selfieUrl: dto.selfieUrl,
          status: 'SUBMITTED',
        },
      });

      return doc;
    });
  }

  async getKycStatus(userId: string): Promise<{
    status: string;
    level: string;
    submittedAt: Date | null;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    latestDocument: KycDocument | null;
  }> {
    const [user, doc] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          kycStatus: true,
          kycLevel: true,
          kycSubmittedAt: true,
          kycVerifiedAt: true,
          kycRejectionReason: true,
        },
      }),
      this.prisma.kycDocument.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!user) throw new NotFoundException();
    return {
      status: user.kycStatus,
      level: user.kycLevel,
      submittedAt: user.kycSubmittedAt,
      verifiedAt: user.kycVerifiedAt,
      rejectionReason: user.kycRejectionReason,
      latestDocument: doc,
    };
  }

  /* Queues a data-export request — the file URL is filled in by an admin
     job that bundles the user's data into a zip and uploads to R2. */
  async requestDataExport(userId: string): Promise<DataExportRequest> {
    /* Throttle: max 1 open request at a time. */
    const open = await this.prisma.dataExportRequest.findFirst({
      where: { userId, status: { in: ['PENDING', 'PROCESSING'] } },
    });
    if (open) return open;
    return this.prisma.dataExportRequest.create({
      data: { userId, status: 'PENDING' },
    });
  }

  async listDataExports(userId: string): Promise<DataExportRequest[]> {
    return this.prisma.dataExportRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
      take: 10,
    });
  }

  /* Soft-delete — marks the user DELETED + sets deletedAt. A 30-day grace
     period lets the user reverse it. After 30 days a cron permanently
     anonymises PII (not implemented here — admin cron later). */
  async deleteAccount(
    userId: string,
    dto: DeleteAccountDto,
    ip: string | undefined,
  ): Promise<{ success: true; gracePeriodEndsAt: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, status: true },
    });
    if (!user) throw new NotFoundException();
    if (user.status === 'DELETED') {
      throw new BadRequestException('Account already deleted');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new ForbiddenException('Password is wrong');

    const gracePeriodEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          /* Revoke active sessions so deletion takes effect immediately. */
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      userId,
      action: 'account.deleted',
      entity: 'User',
      entityId: userId,
      ipAddress: ip,
      severity: 'CRITICAL',
      metadata: { gracePeriodEndsAt: gracePeriodEndsAt.toISOString() },
    });

    return { success: true, gracePeriodEndsAt };
  }
}
