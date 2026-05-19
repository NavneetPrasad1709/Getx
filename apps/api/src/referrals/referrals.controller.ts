import { Controller, Get } from '@nestjs/common';
import type { WalletTransaction } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private svc: ReferralsService) {}

  @Get('me')
  myReferrals(@CurrentUser('id') userId: string): Promise<{
    code: string;
    lifetimeEarned: number;
    pendingCount: number;
    rewardedCount: number;
    rewards: WalletTransaction[];
  }> {
    return this.svc.getMyReferrals(userId);
  }

  /* Public leaderboard — surfaces top referrers anonymised to username
     only. Drives social proof on the referral teaser without leaking
     PII. */
  @Public()
  @Get('leaderboard')
  leaderboard(): Promise<
    Array<{ rank: number; username: string; earned: number }>
  > {
    return this.svc.getLeaderboard();
  }
}
