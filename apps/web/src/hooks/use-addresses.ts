'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label: string | null;
  taxId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AddressInput = Omit<
  Address,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export function useAddresses(enabled = true) {
  return useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<Address[]>('/addresses');
      return data;
    },
    enabled,
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation<Address, Error, AddressInput>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Address>('/addresses', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation<Address, Error, { id: string } & Partial<AddressInput>>({
    mutationFn: async ({ id, ...patch }) => {
      const { data } = await api.patch<Address>(`/addresses/${id}`, patch);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.delete<{ success: true }>(`/addresses/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}
