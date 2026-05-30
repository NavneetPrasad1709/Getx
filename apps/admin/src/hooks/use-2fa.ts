'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
}

export function use2FAStatus() {
  return useQuery<TwoFactorStatus>({
    queryKey: ['2fa', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/auth/2fa/status');
      return data as TwoFactorStatus;
    },
  });
}

export function useSetup2FA() {
  return useMutation<TwoFactorSetup, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post('/auth/2fa/setup');
      return data as TwoFactorSetup;
    },
  });
}

export function useEnable2FA() {
  const qc = useQueryClient();
  return useMutation<{ enabled: boolean }, Error, string>({
    mutationFn: async (code) => {
      const { data } = await api.post('/auth/2fa/enable', { code });
      return data as { enabled: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa'] }),
  });
}

export function useDisable2FA() {
  const qc = useQueryClient();
  return useMutation<{ enabled: boolean }, Error, string>({
    mutationFn: async (code) => {
      const { data } = await api.post('/auth/2fa/disable', { code });
      return data as { enabled: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa'] }),
  });
}
