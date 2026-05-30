import { AxiosError } from 'axios';

/**
 * Extracts a human-readable error message from an Axios error or any thrown
 * value. Returns null when no message can be found so callers can supply a
 * fallback: `toast.error(extractMessage(err) ?? 'Action failed')`.
 *
 * Centralised here to eliminate the identical copy-paste that existed in
 * users/[id], orders/[id], listings, and reviews admin pages.
 */
export function extractMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}
