'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* Profile-edit mutation — PATCH /account/profile.

   Every field is optional; the server validates via UpdateProfileSchema
   and PATCHes only the keys it receives. On success we invalidate the
   `auth` (so the header avatar refreshes) + `user-profile` (so the
   settings form re-reads canonical state) query keys. */

export interface ProfileUpdateInput {
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

export function useProfileUpdate() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, ProfileUpdateInput>({
    mutationFn: async (payload) => {
      const { data } = await api.patch<{ success: true }>(
        '/account/profile',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-profile'] });
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}
