'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ReferralReward {
  id: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
}

export interface MyReferrals {
  code: string;
  lifetimeEarned: number;
  pendingCount: number;
  rewardedCount: number;
  rewards: ReferralReward[];
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  earned: number;
}

export function useMyReferrals(enabled = true) {
  return useQuery<MyReferrals>({
    queryKey: ['referrals', 'me'],
    queryFn: async () => {
      const { data } = await api.get<MyReferrals>('/referrals/me');
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useReferralLeaderboard() {
  return useQuery<LeaderboardRow[]>({
    queryKey: ['referrals', 'leaderboard'],
    queryFn: async () => {
      const { data } = await api.get<LeaderboardRow[]>('/referrals/leaderboard');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
