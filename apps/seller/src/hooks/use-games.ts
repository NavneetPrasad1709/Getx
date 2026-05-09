'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Game {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  icon: string;
  banner: string | null;
  isLaunched: boolean;
  comingSoonAt: string | null;
  totalListings: number;
  totalSellers: number;
  sortOrder: number;
}

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data } = await api.get<Game[]>('/games');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useGame(slug: string) {
  return useQuery({
    queryKey: ['games', slug],
    queryFn: async () => {
      const { data } = await api.get(`/games/${slug}`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useService(gameSlug: string, serviceSlug: string) {
  return useQuery({
    queryKey: ['games', gameSlug, 'services', serviceSlug],
    queryFn: async () => {
      const { data } = await api.get(`/games/${gameSlug}/services/${serviceSlug}`);
      return data;
    },
    enabled: !!gameSlug && !!serviceSlug,
  });
}
