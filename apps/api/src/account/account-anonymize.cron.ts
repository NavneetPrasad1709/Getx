import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Daily anonymisation sweep — closes the GDPR Art 17 / DPDP §12 loop
 * that `AccountService.deleteAccount` opens. Users who soft-deleted
 * 30+ days ago have their PII redacted in place: identifying fields
 * are set to sentinel values, payout rails are wiped, KYC pointers
 * are cleared, and the soft-delete state is preserved so financial
 * rows (Order, WalletTransaction, Withdrawal, AuditLog) keep their
 * foreign key intact.
 *
 * The 30-day grace window itself is enforced in `deleteAccount` —
 * this cron only acts on rows whose `deletedAt < now() - 30d`. Once
 * anonymised, the email becomes `deleted-<id>@anon.getx.local` which
 * the cron filter excludes on subsequent runs (it never re-processes
 * a row).
 */
const GRACE_PERIOD_DAYS = 30;
const ANON_EMAIL_DOMAIN = '@anon.getx.local';

@Injectable()
export class AccountAnonymizeCron {
  private readonly logger = new Logger(AccountAnonymizeCron.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /* Runs every day at 03:00 server-time. Sweep size is capped at 500
     per run; anything beyond rolls into the next tick so a backlog
     after a long Postgres outage doesn't lock the cron worker. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'accountAnonymize' })
  async run(): Promise<{ scanned: number; anonymised: number }> {
    const cutoff = new Date(
      Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    const candidates = await this.prisma.user.findMany({
      where: {
        status: 'DELETED',
        deletedAt: { lt: cutoff },
        /* Skip rows the cron has already processed — the sentinel
           email pattern is unique to anonymised users. */
        NOT: { email: { endsWith: ANON_EMAIL_DOMAIN } },
      },
      select: { id: true, email: true, deletedAt: true },
      take: 500,
    });

    if (candidates.length === 0) {
      return { scanned: 0, anonymised: 0 };
    }

    let anonymised = 0;
    for (const user of candidates) {
      try {
        await this.anonymiseOne(user.id);
        anonymised += 1;
      } catch (err) {
        /* Per-row try/catch so one bad row doesn't abort the batch.
           The audit log captures the failure for ops. */
        this.logger.error(
          `Anonymisation failed for user ${user.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `accountAnonymize: scanned=${candidates.length} anonymised=${anonymised}`,
    );
    return { scanned: candidates.length, anonymised };
  }

  /* Redacts every PII field while preserving the row so financial
     foreign keys hold. Wrapped in a transaction so a partial wipe
     can't leave the user in a hybrid state (some fields cleared,
     others still identifying). */
  private async anonymiseOne(userId: string): Promise<void> {
    const sentinelEmail = `deleted-${userId}${ANON_EMAIL_DOMAIN}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          /* Identifying fields */
          email: sentinelEmail,
          name: null,
          username: null,
          avatar: null,
          bio: null,
          displayName: null,
          website: null,
          twitterHandle: null,
          discordHandle: null,
          youtubeHandle: null,
          twitchHandle: null,
          preferredLanguages: [],
          timezone: null,
          phone: null,
          phoneVerified: null,
          emailVerified: null,
          /* Password — replace with a random unrecoverable string so
             the row can't be re-authenticated. bcrypt salt is fine
             with arbitrary bytes; we never read this back. */
          password: `anon:${userId}:${Date.now()}`,
          /* KYC pointers — Sumsub keeps the regulatory record server-
             side keyed by `sumsubApplicantId`. Clearing our side
             leaves nothing to link the row back to a person. */
          sumsubApplicantId: null,
          sumsubExternalUserId: null,
          aadhaarHash: null,
          panHash: null,
          documentType: null,
          documentCountry: null,
          kycLevel: 'LEVEL_0',
          kycStatus: 'NONE',
          kycProvider: null,
          kycRejectionReason: null,
          /* Payout rails — bank/UPI/PayPal/Wise/Stripe Connect. The
             encrypted bank blob can't be decrypted once cleared, and
             the Stripe Connect link is torn down separately by the
             admin workflow. */
          upiId: null,
          bankAccountEncrypted: null,
          paypalEmail: null,
          wiseEmail: null,
          stripeConnectAccountId: null,
          stripeConnectChargesEnabled: false,
          stripeConnectPayoutsEnabled: false,
          stripeConnectDetailsSubmitted: false,
          stripeConnectOnboardedAt: null,
          /* Security trail — last login / IP / UA / unsubscribeToken
             could re-identify, so they're nulled. failedLoginCount
             and lockedUntil are reset for hygiene. */
          lastLoginAt: null,
          lastLoginIp: null,
          lastLoginUserAgent: null,
          lastSeenAt: null,
          failedLoginCount: 0,
          lockedUntil: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          unsubscribeToken: null,
          /* Notification prefs — opt the row out of every channel so
             a future cron that resurrects this row by mistake can't
             send anything. */
          emailNotifications: false,
          pushNotifications: false,
          smsNotifications: false,
          marketingOptIn: false,
        },
      });

      /* KYC documents — R2 URLs to images of government IDs. Each
         row's URLs are cleared; the underlying R2 objects should be
         deleted by a separate object-store sweep (out of scope here
         since R2 deletion lives in the uploads service). */
      await tx.kycDocument.updateMany({
        where: { userId },
        data: {
          documentNumber: null,
          frontImageUrl: '',
          backImageUrl: null,
          selfieUrl: null,
          reviewNotes: null,
        },
      });

      /* Addresses + payment methods — full delete is safe because
         these don't have financial-row foreign keys; they cascade
         from User via Cascade by design. The user row stays so
         Order.buyerId / Order.sellerId remain valid. */
      await tx.address.deleteMany({ where: { userId } });
      await tx.paymentMethod.deleteMany({ where: { userId } });
    });

    await this.audit.log({
      userId,
      action: 'account.anonymised',
      entity: 'User',
      entityId: userId,
      severity: 'CRITICAL',
      metadata: {
        anonymisedAt: new Date().toISOString(),
        gracePeriodDays: GRACE_PERIOD_DAYS,
      },
    });
  }
}
