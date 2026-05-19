'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  gameSlug: string;
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | null;
  filters: Record<string, unknown>;
  emailAlerts: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SavedSearchFiltersInput = Record<string, unknown>;

export function useMySavedSearches(enabled = true) {
  return useQuery<SavedSearch[]>({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      const { data } = await api.get<SavedSearch[]>('/saved-searches');
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateSavedSearch() {
  const qc = useQueryClient();
  return useMutation<
    SavedSearch,
    Error,
    { name?: string; filters: SavedSearchFiltersInput; emailAlerts?: boolean }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<SavedSearch>('/saved-searches', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}

export function useUpdateSavedSearch() {
  const qc = useQueryClient();
  return useMutation<
    SavedSearch,
    Error,
    { id: string; name?: string; emailAlerts?: boolean }
  >({
    mutationFn: async ({ id, ...patch }) => {
      const { data } = await api.patch<SavedSearch>(
        `/saved-searches/${id}`,
        patch,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.delete<{ success: true }>(
        `/saved-searches/${id}`,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}
