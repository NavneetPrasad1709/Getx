'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingOptIn: boolean;
}

export interface KycStatusResponse {
  status: string;
  level: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  latestDocument: {
    id: string;
    documentType: string;
    selfieUrl: string | null;
    frontImageUrl: string;
    backImageUrl: string | null;
    status: string;
    reviewNotes: string | null;
    createdAt: string;
  } | null;
}

export interface DataExport {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED';
  fileUrl: string | null;
  fileBytes: number | null;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  failReason: string | null;
}

export function useNotificationPrefs(enabled = true) {
  return useQuery<NotificationPrefs>({
    queryKey: ['account', 'notifications'],
    queryFn: async () => {
      const { data } = await api.get<NotificationPrefs>('/account/notifications');
      return data;
    },
    enabled,
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, Partial<NotificationPrefs>>({
    mutationFn: async (payload) => {
      const { data } = await api.patch<{ success: true }>(
        '/account/notifications',
        payload,
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['account', 'notifications'] }),
  });
}

export function useChangePassword() {
  return useMutation<
    { success: true },
    Error,
    { currentPassword: string; newPassword: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<{ success: true }>('/account/password', payload);
      return data;
    },
  });
}

export function useKycStatus(enabled = true) {
  return useQuery<KycStatusResponse>({
    queryKey: ['account', 'kyc'],
    queryFn: async () => {
      const { data } = await api.get<KycStatusResponse>('/account/kyc');
      return data;
    },
    enabled,
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation<
    KycStatusResponse['latestDocument'],
    Error,
    {
      aadhaarNumber: string;
      selfieUrl: string;
      frontImageUrl: string;
      backImageUrl?: string;
    }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<KycStatusResponse['latestDocument']>(
        '/account/kyc',
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', 'kyc'] }),
  });
}

export function useDataExports(enabled = true) {
  return useQuery<DataExport[]>({
    queryKey: ['account', 'data-exports'],
    queryFn: async () => {
      const { data } = await api.get<DataExport[]>('/account/data-export');
      return data;
    },
    enabled,
  });
}

export function useRequestDataExport() {
  const qc = useQueryClient();
  return useMutation<DataExport, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post<DataExport>('/account/data-export');
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['account', 'data-exports'] }),
  });
}

export function useDeleteAccount() {
  return useMutation<
    { success: true; gracePeriodEndsAt: string },
    Error,
    { confirm: 'DELETE MY ACCOUNT'; password: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<{
        success: true;
        gracePeriodEndsAt: string;
      }>('/account/delete', payload);
      return data;
    },
  });
}
