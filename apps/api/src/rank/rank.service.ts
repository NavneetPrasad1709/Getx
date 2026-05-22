import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Prisma, UserRank } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/* RankService — Eldorado-style XP ladder for both buyers + sellers.

   XP earn (fire-and-forget from order/review/dispute/referral hooks):
     buyer  spend $1 = 10 XP (cap 1000/order)
     seller sale $1  = 10 XP (cap 1000/order)
     review left     = 100 XP
     referred friend's first order = 500 XP
     dispute won (buyer side)      = 50 XP
     dispute resolved fairly (seller) = 50 XP
     review received 5★ (seller)   = 50 XP

   Rank ladder:
     ROOKIE  — default
     RISING  — 100 XP + 1 order + KYC VERIFIED
     TRUSTED — 500 XP + 10 orders + 4.5★ + KYC
     PRO     — 2,000 XP + 50 orders + 4.7★ + KYC
     ELITE   — 10,000 XP + 200 orders + 4.85★ + KYC
     LEGEND  — 50,000 XP + 1000 orders + 4.9★

   Cron runs hourly, recomputes rank for users whose rankUpdatedAt is
   stale relative to their lastSeenAt or recent activity. Promotions fire
   a notification + a tier-bonus loyalty award. */

interface RankGate {
  rank: UserRank;
  xp: number;
  orders: number;
  rating: number;
  needsKyc: boolean;
  bonusPoints: number;
}

const LADDER: RankGate[] = [
  {
    rank: 'ROOKIE',
    xp: 0,
    orders: 0,
    rating: 0,
    needsKyc: false,
    bonusPoints: 0,
  },
  {
    rank: 'RISING',
    xp: 100,
    orders: 1,
    rating: 0,
    needsKyc: true,
    bonusPoints: 100,
  },
  {
    rank: 'TRUSTED',
    xp: 500,
    orders: 10,
    rating: 4.5,
    needsKyc: true,
    bonusPoints: 250,
  },
  {
    rank: 'PRO',
    xp: 2_000,
    orders: 50,
    rating: 4.7,
    needsKyc: true,
    bonusPoints: 500,
  },
  {
    rank: 'ELITE',
    xp: 10_000,
    orders: 200,
    rating: 4.85,
    needsKyc: true,
    bonusPoints: 1_000,
  },
  {
    rank: 'LEGEND',
    xp: 50_000,
    orders: 1_000,
    rating: 4.9,
    needsKyc: false,
    bonusPoints: 2_500,
  },
];

@Injectable()
export class RankService {
  private readonly logger = new Logger(RankService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /* One-shot migration: seeds rank + xp from the legacy verifiedTier
     column and totalSales×10 baseline. Idempotent — re-running it on a
     row that already has non-default rank/xp is a no-op. Called by an
     admin script during the rank rollout; safe to leave in prod since
     the LADDER cron strictly never demotes. */
  async backfillFromLegacyTier(): Promise<{ migrated: number }> {
    const TIER_MAP: Record<string, UserRank> = {
      BASIC: 'ROOKIE',
      VERIFIED: 'RISING',
      PREMIUM: 'PRO',
      ELITE: 'ELITE',
    };
    /* Only touch rows still at the default (ROOKIE + xp 0). Anything
       with non-zero xp has already moved through the live ladder. */
    const rows = await this.prisma.user.findMany({
      where: { rank: 'ROOKIE', xp: 0 },
      select: { id: true, verifiedTier: true, totalSales: true },
    });
    let migrated = 0;
    for (const u of rows) {
      const tier = u.verifiedTier;
      if (!tier && u.totalSales === 0) continue;
      const mappedRank = tier ? (TIER_MAP[tier] ?? 'ROOKIE') : 'ROOKIE';
      const baselineXp = Math.min(u.totalSales * 10, 999_999);
      if (mappedRank === 'ROOKIE' && baselineXp === 0) continue;
      await this.prisma.user.update({
        where: { id: u.id },
        data: {
          rank: mappedRank,
          xp: baselineXp,
          rankUpdatedAt: new Date(),
        },
      });
      migrated += 1;
    }
    this.logger.log(`Rank backfill: ${migrated} users migrated`);
    return { migrated };
  }

  /* Per-rank cashback rate. Buyer earns this fraction of buyerTotal
     in GETX Coins on order completion. Used by WalletService. */
  static cashbackRateFor(rank: UserRank): number {
    switch (rank) {
      case 'RISING':
        return 0.015;
      case 'TRUSTED':
        return 0.02;
      case 'PRO':
        return 0.025;
      case 'ELITE':
        return 0.03;
      case 'LEGEND':
        return 0.04;
      default:
        return 0.01;
    }
  }

  /* Per-rank seller commission rate. Sellers at higher ranks keep more
     of each sale. Used by OrdersService when computing commission /
     sellerAmount at order creation. */
  static sellerCommissionRateFor(rank: UserRank): number {
    switch (rank) {
      case 'TRUSTED':
        return 0.09;
      case 'PRO':
        return 0.08;
      case 'ELITE':
        return 0.07;
      case 'LEGEND':
        return 0.06;
      default:
        return 0.1;
    }
  }

  /* PRO+ sellers get half their Sumsub KYC fee refunded as a perk. The
     refund is paid into the seller wallet at first VERIFIED transition
     (handled by AccountService.handleSumsubWebhook). */
  static sumsubRefundEligible(rank: UserRank): boolean {
    return rank === 'PRO' || rank === 'ELITE' || rank === 'LEGEND';
  }

  /* Credit XP inside an existing transaction. Caller decides when
     (order complete, review submitted, dispute resolved, etc.). XP never
     decreases — promotions are checked separately by the cron. */
  async earnXp(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    });
  }

  /* Compute the highest rank a user qualifies for given current stats.
     Buyer and seller share the same ladder — `totalSales` covers both
     directions for v1 (buyer's order count maps to totalSales when they
     completed it as buyer; we use orderCount fallback later). */
  private computeRank(stats: {
    xp: number;
    totalSales: number;
    sellerRating: number;
    buyerRating: number;
    kycStatus: string;
  }): UserRank {
    /* For buyers without sells, ratings come from buyerRating; sellers
       use sellerRating. Take the max so buyer-side activity counts. */
    const effectiveRating = Math.max(stats.sellerRating, stats.buyerRating);
    const kycOk = stats.kycStatus === 'VERIFIED';

    let highest: UserRank = 'ROOKIE';
    for (const gate of LADDER) {
      if (stats.xp < gate.xp) continue;
      if (stats.totalSales < gate.orders) continue;
      if (effectiveRating < gate.rating) continue;
      if (gate.needsKyc && !kycOk) continue;
      highest = gate.rank;
    }
    return highest;
  }

  /* Cron — runs hourly. Scans users whose rankUpdatedAt is older than
     1h, recomputes rank, promotes (never demotes), writes audit + fires
     notification + credits tier-bonus loyalty points. */
  @Cron(CronExpression.EVERY_HOUR, { name: 'rankRecompute' })
  async recomputeAll(): Promise<{ scanned: number; promoted: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const candidates = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ rankUpdatedAt: { lt: oneHourAgo } }, { rank: 'ROOKIE' }],
      },
      select: {
        id: true,
        rank: true,
        xp: true,
        totalSales: true,
        sellerRating: true,
        buyerRating: true,
        kycStatus: true,
      },
      take: 500,
    });

    let promoted = 0;
    for (const u of candidates) {
      const newRank = this.computeRank(u);
      if (newRank === u.rank) {
        /* No change — still bump rankUpdatedAt so we don't re-scan. */
        await this.prisma.user.update({
          where: { id: u.id },
          data: { rankUpdatedAt: new Date() },
        });
        continue;
      }

      const isPromotion =
        LADDER.findIndex((g) => g.rank === newRank) >
        LADDER.findIndex((g) => g.rank === u.rank);
      if (!isPromotion) {
        /* Never demote — manual admin action only. Just bump cursor. */
        await this.prisma.user.update({
          where: { id: u.id },
          data: { rankUpdatedAt: new Date() },
        });
        continue;
      }

      const gate = LADDER.find((g) => g.rank === newRank);
      if (!gate) continue;

      await this.prisma.$transaction(async (tx) => {
        /* Read balance before incrementing so the ledger row carries
           the post-credit value without a second round-trip. */
        const before = await tx.user.findUnique({
          where: { id: u.id },
          select: { loyaltyPoints: true },
        });
        const balanceAfter = (before?.loyaltyPoints ?? 0) + gate.bonusPoints;

        await tx.user.update({
          where: { id: u.id },
          data: {
            rank: newRank,
            rankUpdatedAt: new Date(),
            /* Tier-bonus loyalty points — never expire (engagement
               reward, not earning). */
            loyaltyPoints: { increment: gate.bonusPoints },
            lifetimeLoyaltyPoints: { increment: gate.bonusPoints },
          },
        });
        if (gate.bonusPoints > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: u.id,
              type: 'EARNED_TIER_BONUS',
              points: gate.bonusPoints,
              balanceAfter,
              description: `${newRank} promotion bonus`,
              /* Tier bonuses never expire (engagement reward, not
                 earn-from-spend). */
              expiresAt: null,
            },
          });
        }
      });

      /* Out-of-tx — notification can fail without rolling back the
         promotion. RANK_PROMOTED type lets buyers filter their inbox
         and lets us style the email differently from generic blasts. */
      void this.notifications.create({
        userId: u.id,
        type: 'RANK_PROMOTED',
        title: `You're now ${newRank}`,
        message: `Rank up! You earned ${gate.bonusPoints} bonus loyalty points and unlocked new perks.`,
        link: '/sellers/program',
        metadata: { newRank, oldRank: u.rank },
        sendEmail: true,
      });

      promoted += 1;
    }

    if (promoted > 0) {
      this.logger.log(
        `Rank recompute: ${candidates.length} scanned · ${promoted} promoted`,
      );
    }
    return { scanned: candidates.length, promoted };
  }
}
