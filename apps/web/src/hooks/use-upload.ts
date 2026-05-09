'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UploadResult {
  url: string;
  key: string;
}

export function useUploadImage() {
  return useMutation<UploadResult, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post<UploadResult>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
  });
}
