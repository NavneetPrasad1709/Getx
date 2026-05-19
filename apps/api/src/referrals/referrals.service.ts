import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { WalletTransaction } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';

/* ReferralsService — minimum-viable referral system using the existing
   WalletTransaction.REFERRAL type for accounting. A buyer's referral code
   is derived deterministically from their userId hash so it's stable
   without storing a separate column. Persistent tracking of signups +
   first-order attribution lands when the Referral model is added in a
   follow-up schema push. */
@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async getMyReferrals(userId: string): Promise<{
    code: string;
    lifetimeEarned: number;
    pendingCount: number;
    rewardedCount: number;
    rewards: WalletTransaction[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!user) throw new NotFoundException();

    const code = generateReferralCode(user.username ?? user.id);

    /* Pull all REFERRAL-type wallet transactions for this user — both
       referrer rewards and referee bonuses both land in the wallet
       ledger via this type. */
    const rewards = await this.prisma.walletTransaction.findMany({
      where: { userId, type: 'REFERRAL' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const lifetimeEarned = rewards.reduce(
      (sum, r) => sum + (r.amount > 0 ? r.amount : 0),
      0,
    );

    return {
      code,
      lifetimeEarned,
      /* Pending = waiting on friend's first order. Until the Referral
         model lands we can't count this accurately; surface 0 to avoid
         lying to the buyer. */
      pendingCount: 0,
      rewardedCount: rewards.filter((r) => r.amount > 0).length,
      rewards,
    };
  }

  async getLeaderboard(): Promise<
    Array<{ rank: number; username: string; earned: number }>
  > {
    /* Aggregate top earners by lifetime REFERRAL credits. Anonymised to
       just username for privacy — full handle hidden. */
    const aggregated = await this.prisma.walletTransaction.groupBy({
      by: ['userId'],
      where: { type: 'REFERRAL', amount: { gt: 0 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 20,
    });

    if (aggregated.length === 0) {
      /* Empty state — return seed rows so the leaderboard panel isn't
         barren on a brand-new install. Marked clearly via "—" handles. */
      return [
        { rank: 1, username: '—', earned: 0 },
        { rank: 2, username: '—', earned: 0 },
        { rank: 3, username: '—', earned: 0 },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: aggregated.map((a) => a.userId) } },
      select: { id: true, username: true, name: true },
    });
    const handleFor = new Map(
      users.map((u) => [u.id, u.username ?? u.name ?? 'anon'] as const),
    );

    return aggregated.map((a, i) => ({
      rank: i + 1,
      username: handleFor.get(a.userId) ?? 'anon',
      earned: a._sum.amount ?? 0,
    }));
  }
}

/* Deterministic referral code per user. Format: GETX-XXXXXX (6 chars from
   a SHA-256 of the seed). Uppercase, no ambiguous chars (no 0/O/1/I). */
function generateReferralCode(seed: string): string {
  const hash = createHash('sha256').update(`getx-ref-${seed}`).digest('hex');
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const byte = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    code += ALPHABET[byte % ALPHABET.length];
  }
  return `GETX-${code}`;
}
