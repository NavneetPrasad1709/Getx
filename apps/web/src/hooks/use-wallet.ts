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
    /* Refetch on tab focus so the balance + ledger stay in sync after a
       payout, cashback credit, or refund elsewhere in the app. */
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

export function useApplyWallet() {
  const qc = useQueryClient();
  return useMutation<
    { walletApplied: number; newBalance: number; chargeable: number },
    Error,
    { orderId: string; amount: number }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<{
        walletApplied: number;
        newBalance: number;
        chargeable: number;
      }>('/wallet/apply', payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['orders', vars.orderId] });
    },
  });
}

/* Withdraw payload — discriminated by method. Frontend picker collects the
   right fields per rail; backend validates via zod discriminatedUnion. */
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
