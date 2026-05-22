import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { LoyaltyTransaction, Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';

/* LoyaltyService — buyer-side points ledger.

   Earn rules (all atomic with the underlying business event):
     order.completed  → 1 pt per $1 of buyerTotal
     review submit    → 50 pt
     referral first-order → 500 pt (both sides)
     profile complete → 100 pt (one-time)
     rank promotion   → bonus tier (RISING 100, TRUSTED 250, PRO 500,
                        ELITE 1000, LEGEND 2500)

   Redeem rule: max 50% of order subtotal, 1pt = $0.01.

   Expiry: 12 months after earn. Daily cron sweeps. EXPIRED row written
   so the ledger is auditable. */

const POINT_TO_USD = 0.01;
const REDEEM_CAP_PCT = 0.5;
const EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;
/* Anti-farm: per-user, per-day cap across all earning events. Picked
   to land just above a comfortable power-buyer ceiling (~$1k/day) so
   it never bites a real customer but blunts sybil/multi-account
   farming. Per-order cap (1000/order) layers on top of this. */
const DAILY_EARN_CAP = 1000;
/* Tier-bonus + profile-complete bypass the daily cap — they're
   one-shot lifetime rewards, not earn-rate-driven. */
const DAILY_CAP_BYPASS = new Set<string>([
  'EARNED_TIER_BONUS',
  'EARNED_PROFILE_COMPLETE',
  'EARNED_FIRST_LISTING',
]);

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private prisma: PrismaService) {}

  async getMyLoyalty(userId: string): Promise<{
    balance: number;
    lifetime: number;
    nextExpiry: { points: number; expiresAt: Date } | null;
    ledger: LoyaltyTransaction[];
  }> {
    const [user, ledger, soonest] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true, lifetimeLoyaltyPoints: true },
      }),
      this.prisma.loyaltyTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.loyaltyTransaction.findFirst({
        where: {
          userId,
          points: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: 'asc' },
        select: { points: true, expiresAt: true },
      }),
    ]);
    if (!user) throw new NotFoundException();
    return {
      balance: user.loyaltyPoints,
      lifetime: user.lifetimeLoyaltyPoints,
      nextExpiry:
        soonest && soonest.expiresAt
          ? { points: soonest.points, expiresAt: soonest.expiresAt }
          : null,
      ledger,
    };
  }

  /* Credit points from any earn-event. Runs inside the caller's tx so
     wallet + loyalty land atomically with the underlying business event
     (order complete, review submit, etc.). */
  async earn(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      type:
        | 'EARNED_PURCHASE'
        | 'EARNED_REFERRAL'
        | 'EARNED_REVIEW'
        | 'EARNED_TIER_BONUS'
        | 'EARNED_FIRST_LISTING'
        | 'EARNED_PROFILE_COMPLETE';
      points: number;
      description: string;
      orderId?: string;
      referralId?: string;
      noExpiry?: boolean;
    },
  ): Promise<number> {
    if (params.points <= 0) return 0;
    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: { loyaltyPoints: true },
    });
    if (!user) return 0;

    /* Daily cap — sum positive earn rows in the last 24h, excluding
       one-shot bypass types. If credit would push past DAILY_EARN_CAP,
       clamp it. Hard cap > 0 so we never silently fail an earn-zero;
       just return the clamped amount. */
    let credit = params.points;
    if (!DAILY_CAP_BYPASS.has(params.type)) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await tx.loyaltyTransaction.aggregate({
        where: {
          userId: params.userId,
          createdAt: { gte: since },
          points: { gt: 0 },
          type: {
            in: ['EARNED_PURCHASE', 'EARNED_REVIEW', 'EARNED_REFERRAL'],
          },
        },
        _sum: { points: true },
      });
      const earnedToday = recent._sum.points ?? 0;
      const remaining = Math.max(0, DAILY_EARN_CAP - earnedToday);
      credit = Math.min(credit, remaining);
      if (credit <= 0) {
        this.logger.log(
          `Loyalty daily cap hit for user=${params.userId} (today=${earnedToday})`,
        );
        return 0;
      }
    }

    const newBalance = user.loyaltyPoints + credit;
    await tx.user.update({
      where: { id: params.userId },
      data: {
        loyaltyPoints: { increment: credit },
        lifetimeLoyaltyPoints: { increment: credit },
      },
    });
    await tx.loyaltyTransaction.create({
      data: {
        userId: params.userId,
        type: params.type,
        points: credit,
        balanceAfter: newBalance,
        description: params.description,
        orderId: params.orderId ?? null,
        referralId: params.referralId ?? null,
        expiresAt: params.noExpiry ? null : new Date(Date.now() + EXPIRY_MS),
      },
    });
    return credit;
  }

  /* Read-only preview — returns the max points the buyer can apply on
     a given order. Mirrors applyToOrder's cap math (50% of subtotal,
     clamped to balance) without mutating state. The order page renders
     the toggle copy from this. */
  async previewForOrder(
    userId: string,
    orderId: string,
  ): Promise<{
    balance: number;
    maxPoints: number;
    maxUsd: number;
    alreadyApplied: { points: number; usd: number };
    walletApplied: number;
    blockedByWallet: boolean;
  }> {
    const [user, order] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true },
      }),
      this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          buyerId: true,
          status: true,
          amount: true,
          walletApplied: true,
          loyaltyPointsApplied: true,
          loyaltyUsdApplied: true,
        },
      }),
    ]);
    if (!user) throw new NotFoundException();
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException();

    /* Cap is computed off the merchandise subtotal (Order.amount), not
       buyerTotal, so platform fee + tax stay payable in cash. */
    const maxByCap = Math.floor((order.amount * REDEEM_CAP_PCT) / POINT_TO_USD);
    const maxPoints = Math.max(0, Math.min(user.loyaltyPoints, maxByCap));
    return {
      balance: user.loyaltyPoints,
      maxPoints,
      maxUsd: maxPoints * POINT_TO_USD,
      alreadyApplied: {
        points: order.loyaltyPointsApplied,
        usd: order.loyaltyUsdApplied,
      },
      walletApplied: order.walletApplied,
      blockedByWallet: order.walletApplied > 0,
    };
  }

  /* Apply loyalty points to a PENDING order. Atomic — never lets a
     buyer over-redeem under concurrent checkouts. Mutex with the cash
     wallet: throws if walletApplied > 0 on the same order. The payment
     flow later subtracts loyaltyUsdApplied from the gateway charge. */
  async applyToOrder(
    userId: string,
    orderId: string,
    pointsRequested: number,
  ): Promise<{
    pointsApplied: number;
    usdValue: number;
    newBalance: number;
    chargeable: number;
  }> {
    if (pointsRequested <= 0) {
      throw new BadRequestException('points must be > 0');
    }
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          status: true,
          amount: true,
          buyerTotal: true,
          walletApplied: true,
          loyaltyPointsApplied: true,
          orderNumber: true,
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.buyerId !== userId) throw new ForbiddenException();
      if (order.status !== 'PENDING') {
        throw new BadRequestException(
          'Points can only be applied before payment',
        );
      }
      if (order.walletApplied > 0) {
        throw new BadRequestException(
          'GETX Coins already applied — remove them before redeeming points',
        );
      }
      if (order.loyaltyPointsApplied > 0) {
        throw new BadRequestException(
          'Points already applied — remove them first',
        );
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true },
      });
      if (!user) throw new NotFoundException();

      const maxByCap = Math.floor(
        (order.amount * REDEEM_CAP_PCT) / POINT_TO_USD,
      );
      const applied = Math.min(pointsRequested, user.loyaltyPoints, maxByCap);
      if (applied <= 0) {
        throw new BadRequestException('Nothing to redeem');
      }
      const usdValue = applied * POINT_TO_USD;
      const newBalance = user.loyaltyPoints - applied;

      await tx.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: applied } },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          loyaltyPointsApplied: applied,
          loyaltyUsdApplied: usdValue,
        },
      });
      await tx.loyaltyTransaction.create({
        data: {
          userId,
          type: 'REDEEMED_AT_CHECKOUT',
          points: -applied,
          balanceAfter: newBalance,
          orderId: order.id,
          description: `Redeemed ${applied} pts on order ${order.orderNumber}`,
        },
      });

      return {
        pointsApplied: applied,
        usdValue,
        newBalance,
        chargeable: Math.max(0, order.buyerTotal - usdValue),
      };
    });
  }

  /* Buyer-initiated removal before payment — order must still be
     PENDING. Wraps refundOnCancel in its own tx so the controller path
     stays simple. Returns success even when nothing was applied so the
     UI can call it as an idempotent "clear" action. */
  async removeFromOrder(
    userId: string,
    orderId: string,
  ): Promise<{ success: true }> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          status: true,
          loyaltyPointsApplied: true,
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.buyerId !== userId) throw new ForbiddenException();
      if (order.status !== 'PENDING') {
        throw new BadRequestException(
          'Points can only be removed before payment',
        );
      }
      await this.refundOnCancel(tx, orderId);
      return { success: true as const };
    });
  }

  /* Restore points when an order cancels. Idempotent — running twice
     on the same order does not double-credit. Called from inside the
     order-cancel tx so balance lands atomically. */
  async refundOnCancel(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        loyaltyPointsApplied: true,
        orderNumber: true,
      },
    });
    if (!order || order.loyaltyPointsApplied <= 0) return;
    const points = order.loyaltyPointsApplied;
    const user = await tx.user.findUnique({
      where: { id: order.buyerId },
      select: { loyaltyPoints: true },
    });
    if (!user) return;
    const newBalance = user.loyaltyPoints + points;
    await tx.user.update({
      where: { id: order.buyerId },
      data: { loyaltyPoints: { increment: points } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        userId: order.buyerId,
        type: 'ADJUSTMENT',
        points,
        balanceAfter: newBalance,
        orderId: order.id,
        description: `Restored ${points} pts from cancelled order ${order.orderNumber}`,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyPointsApplied: 0, loyaltyUsdApplied: 0 },
    });
  }

  /* Daily expiry sweep — earnings past 12 months expire. Cron runs
     03:30 UTC after the FX cron. Per-row EXPIRED entry preserves audit. */
  @Cron('30 3 * * *', { name: 'loyaltyExpirySweep' })
  async expireOldPoints(): Promise<{
    usersAffected: number;
    pointsExpired: number;
  }> {
    const now = new Date();

    /* Find unexpired earn rows whose expiresAt has passed. Group by user
       so we can update balance + write one EXPIRED row per user. */
    const expired = await this.prisma.loyaltyTransaction.groupBy({
      by: ['userId'],
      where: {
        points: { gt: 0 },
        expiresAt: { lt: now, not: null },
        /* Skip rows that already have a corresponding EXPIRED entry —
           we mark expiresAt = null on the source row after sweeping so
           it's not picked up again. */
      },
      _sum: { points: true },
    });

    if (expired.length === 0) return { usersAffected: 0, pointsExpired: 0 };

    let total = 0;
    for (const row of expired) {
      const pts = row._sum.points ?? 0;
      if (pts <= 0) continue;
      try {
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: row.userId },
            select: { loyaltyPoints: true },
          });
          if (!user) return;
          /* Can't expire more than current balance (buyer may have
             redeemed some already). */
          const toExpire = Math.min(pts, user.loyaltyPoints);
          if (toExpire <= 0) return;
          const newBalance = user.loyaltyPoints - toExpire;
          await tx.user.update({
            where: { id: row.userId },
            data: { loyaltyPoints: { decrement: toExpire } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: row.userId,
              type: 'EXPIRED',
              points: -toExpire,
              balanceAfter: newBalance,
              description: `${toExpire} pts expired (12-month rule)`,
            },
          });
          /* Mark source rows as swept by clearing expiresAt. */
          await tx.loyaltyTransaction.updateMany({
            where: {
              userId: row.userId,
              points: { gt: 0 },
              expiresAt: { lt: now, not: null },
            },
            data: { expiresAt: null },
          });
          total += toExpire;
        });
      } catch (err) {
        this.logger.warn(
          `Expiry failed for user=${row.userId}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Loyalty expiry sweep: ${expired.length} users · ${total} pts retired`,
    );
    return { usersAffected: expired.length, pointsExpired: total };
  }
}
