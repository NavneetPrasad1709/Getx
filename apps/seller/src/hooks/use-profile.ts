'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ── KYC status ──────────────────────────────────────────────────── */
export interface KycStatusResp {
  status: 'NONE' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  level: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  latestDocument: unknown | null;
}

export function useKycStatus(enabled = true) {
  return useQuery<KycStatusResp>({
    queryKey: ['account-kyc'],
    queryFn: async () => {
      const { data } = await api.get<KycStatusResp>('/account/kyc');
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useSumsubToken() {
  return useMutation<{ token: string; userId: string; mock: boolean }, Error, void>({
    mutationFn: async () => {
      const { data } = await api.get<{
        token: string;
        userId: string;
        mock: boolean;
      }>('/account/kyc/sumsub-token');
      return data;
    },
  });
}

/* ── Profile update ──────────────────────────────────────────────── */
export interface UpdateProfilePayload {
  displayName?: string | null;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  twitterHandle?: string | null;
  discordHandle?: string | null;
  youtubeHandle?: string | null;
  twitchHandle?: string | null;
  preferredLanguages?: string[];
  timezone?: string | null;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      const { data } = await api.patch<{ success: true }>('/account/profile', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });
}
