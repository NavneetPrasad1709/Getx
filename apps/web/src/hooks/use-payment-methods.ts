'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PaymentMethodType = 'UPI' | 'CARD' | 'BANK';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  upiId: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  label: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function usePaymentMethods(enabled = true) {
  return useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data } = await api.get<PaymentMethod[]>('/payment-methods');
      return data;
    },
    enabled,
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation<
    PaymentMethod,
    Error,
    { type: PaymentMethodType; upiId?: string; label?: string; isDefault?: boolean }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<PaymentMethod>('/payment-methods', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation<
    PaymentMethod,
    Error,
    { id: string; upiId?: string; label?: string; isDefault?: boolean }
  >({
    mutationFn: async ({ id, ...patch }) => {
      const { data } = await api.patch<PaymentMethod>(
        `/payment-methods/${id}`,
        patch,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.delete<{ success: true }>(
        `/payment-methods/${id}`,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}
