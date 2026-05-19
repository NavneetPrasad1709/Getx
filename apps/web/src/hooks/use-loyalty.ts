'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* Loyalty hook — reads GET /loyalty/me.

   The API returns the user's current GETX Coins balance, lifetime earned
   total, the next-expiring chunk (so we can warn before points lapse),
   and the full ledger of earn / redeem / expire / adjustment rows. The
   ledger is already ordered server-side (newest first). We refetch on
   tab focus + a short 15s staleTime so balance + ledger stay live after
   an order completes elsewhere in the app. */

export type LoyaltyTxnType =
  | 'EARNED_PURCHASE'
  | 'EARNED_REFERRAL'
  | 'EARNED_REVIEW'
  | 'EARNED_TIER_BONUS'
  | 'EARNED_FIRST_LISTING'
  | 'EARNED_PROFILE_COMPLETE'
  | 'REDEEMED_AT_CHECKOUT'
  | 'EXPIRED'
  | 'ADJUSTMENT';

export interface LoyaltyTxn {
  id: string;
  userId: string;
  type: LoyaltyTxnType;
  points: number;
  orderId: string | null;
  referralId: string | null;
  description: string;
  balanceAfter: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface LoyaltyState {
  balance: number;
  lifetime: number;
  nextExpiry: { points: number; expiresAt: string } | null;
  ledger: LoyaltyTxn[];
}

export function useLoyalty(enabled = true) {
  return useQuery<LoyaltyState>({
    queryKey: ['loyalty', 'me'],
    queryFn: async () => {
      const { data } = await api.get<LoyaltyState>('/loyalty/me');
      return data;
    },
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

/* Preview the cap + already-applied state for a specific pending order.
   Cheap read — used to render the apply-at-checkout toggle. */
export interface LoyaltyPreview {
  balance: number;
  maxPoints: number;
  maxUsd: number;
  alreadyApplied: { points: number; usd: number };
  walletApplied: number;
  blockedByWallet: boolean;
}

export function useLoyaltyPreview(orderId: string | null, enabled = true) {
  return useQuery<LoyaltyPreview>({
    queryKey: ['loyalty', 'preview', orderId],
    queryFn: async () => {
      const { data } = await api.get<LoyaltyPreview>(
        `/loyalty/preview/${orderId}`,
      );
      return data;
    },
    enabled: enabled && !!orderId,
    staleTime: 0,
  });
}

export interface ApplyLoyaltyResult {
  pointsApplied: number;
  usdValue: number;
  newBalance: number;
  chargeable: number;
}

export function useApplyLoyalty() {
  const qc = useQueryClient();
  return useMutation<
    ApplyLoyaltyResult,
    Error,
    { orderId: string; points: number }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<ApplyLoyaltyResult>(
        '/loyalty/apply',
        payload,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['loyalty'] });
      void qc.invalidateQueries({ queryKey: ['orders', vars.orderId] });
    },
  });
}

export function useRemoveLoyalty() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, { orderId: string }>({
    mutationFn: async ({ orderId }) => {
      const { data } = await api.delete<{ success: true }>(
        `/loyalty/apply/${orderId}`,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['loyalty'] });
      void qc.invalidateQueries({ queryKey: ['orders', vars.orderId] });
    },
  });
}
