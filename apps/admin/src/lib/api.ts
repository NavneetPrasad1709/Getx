import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { requestStepUpToken } from './step-up';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  /* Same 15s ceiling as the web/seller apps — keeps a hung Railway
     request from holding the browser's connection pool open
     indefinitely. Genuinely-slow flows (CSV export, bulk action)
     should stream or move to a background job, not bump this. */
  timeout: 15_000,
});

// Admin console is auth-required everywhere except the auth pages.
function isPublicPath(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _stepUp?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (!original) return Promise.reject(error);

    /* AUTH-008: a CRITICAL action came back demanding step-up re-auth. Pop the
       re-auth modal, then replay the SAME request with the fresh token. Handled
       before the _retry guard so it still fires on a request that already went
       through the 401→refresh path. */
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (
      error.response?.status === 403 &&
      code === 'step_up_required' &&
      !original._stepUp
    ) {
      original._stepUp = true;
      try {
        const token = await requestStepUpToken();
        original.headers = {
          ...(original.headers ?? {}),
          'X-Step-Up-Token': token,
        };
        return api(original);
      } catch {
        // User cancelled the modal — surface the original 403.
        return Promise.reject(error);
      }
    }

    if (original._retry) return Promise.reject(error);

    const url = original.url ?? '';
    const isAuthProbe =
      url.includes('/auth/me') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/logout');

    if (error.response?.status !== 401 || isAuthProbe) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push(() => {
          api(original).then(resolve).catch(reject);
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await api.post('/auth/refresh');
      const subs = refreshSubscribers;
      refreshSubscribers = [];
      isRefreshing = false;
      subs.forEach((cb) => cb());
      return api(original);
    } catch (refreshError) {
      isRefreshing = false;
      refreshSubscribers = [];
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        window.location.href = '/auth/login';
      }
      return Promise.reject(refreshError);
    }
  },
);
