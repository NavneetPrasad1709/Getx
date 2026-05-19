'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type WalletTxnType =
  | 'ORDER_RELEASED'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_FEE'
  | 'REFUND'
  | 'CHARGEBACK'
  | 'BONUS'
  | 'ADJUSTMENT'
  | 'REFERRAL'
  | 'CASHBACK'
  | 'SPEND';

export interface WalletTxn {
  id: string;
  userId: string;
  type: WalletTxnType;
  amount: number;
  currency: string;
  orderId: string | null;
  withdrawalId: string | null;
  refundId: string | null;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface WalletSnapshot {
  balance: number;
  pendingEarnings: number;
  sellerWallet: number;
  totalEarned: number;
  totalSpent: number;
  ledger: WalletTxn[];
}

export function useWallet(enabled = true) {
  return useQuery<WalletSnapshot>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await api.get<WalletSnapshot>('/wallet');
      return data;
    },
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

/* Withdrawal — discriminated by method. Stripe Connect is the rail in
   production; the older UPI/PayPal/Wise/BANK methods still flow through
   /wallet/withdraw for back-compat. */
export type WithdrawInput =
  | { method: 'UPI'; amount: number; upiId: string }
  | { method: 'PAYPAL'; amount: number; paypalEmail: string }
  | { method: 'WISE'; amount: number; wiseEmail: string }
  | {
      method: 'BANK_TRANSFER_INTL';
      amount: number;
      holderName: string;
      iban: string;
      bic: string;
      bankName: string;
    };

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, WithdrawInput>({
    mutationFn: async (payload) => {
      const { data } = await api.post<{ id: string }>('/wallet/withdraw', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet'] }),
  });
}

/* ── Stripe Connect (payout rail) ───────────────────────────────────── */
export interface PayoutsStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardedAt: string | null;
}

export function usePayoutsStatus(enabled = true) {
  return useQuery<PayoutsStatus>({
    queryKey: ['payouts-status'],
    queryFn: async () => {
      const { data } = await api.get<PayoutsStatus>('/payouts/connect/status');
      return data;
    },
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useStartPayoutOnboarding() {
  return useMutation<
    { url: string; expiresAt: string },
    Error,
    { returnPath?: string; refreshPath?: string } | void
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<{ url: string; expiresAt: string }>(
        '/payouts/connect/start',
        payload ?? {},
      );
      return data;
    },
  });
}
