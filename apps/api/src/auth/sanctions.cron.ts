import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HARD_BLOCKED_COUNTRIES } from './sanctions';

/* Daily sanctions sweep — catches accounts whose country was added to
   the hard-block list after signup, or which had no country recorded
   when the list was extended. The signup-time check is authoritative
   for new accounts; this cron is the catch-net for existing rows.

   In a future revision this also reconciles against the live OFAC SDN
   feed (downloadable XML at sanctionssearch.ofac.treas.gov). For v1
   we scan against the static HARD_BLOCKED_COUNTRIES set so ops can
   review the audit log without depending on an external feed.

   Hits move the account to SUSPENDED status so payouts + checkout
   halt. Manual admin review re-activates a false positive. */
@Injectable()
export class SanctionsCron {
  private readonly logger = new Logger(SanctionsCron.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'sanctionsSweep' })
  async sweep(): Promise<{ scanned: number; flagged: number }> {
    const candidates = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        country: { in: Array.from(HARD_BLOCKED_COUNTRIES) },
      },
      select: { id: true, email: true, country: true },
      take: 500,
    });

    if (candidates.length === 0) {
      return { scanned: 0, flagged: 0 };
    }

    let flagged = 0;
    for (const u of candidates) {
      try {
        await this.prisma.user.update({
          where: { id: u.id },
          data: {
            status: 'SUSPENDED',
            suspendedUntil: null,
            banReason: `Sanctions sweep: country ${u.country} on block list`,
          },
        });
        await this.audit.log({
          userId: u.id,
          action: 'sanctions.cron_flagged',
          entity: 'User',
          entityId: u.id,
          metadata: { country: u.country },
          severity: 'CRITICAL',
        });
        flagged += 1;
      } catch (err) {
        this.logger.warn(
          `Sanctions sweep skip user=${u.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Sanctions sweep: ${candidates.length} scanned · ${flagged} suspended`,
    );
    return { scanned: candidates.length, flagged };
  }
}
