import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

// Same-origin via Next.js rewrites — avoids Safari ITP blocking cross-site cookies.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  /* Same 15s ceiling as the web/admin apps — keeps a hung Railway
     request from holding the browser's connection pool open
     indefinitely. */
  timeout: 15_000,
});

// Seller dashboard is auth-required everywhere except the auth pages.
function isPublicPath(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (!original) return Promise.reject(error);

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
      /* FE-003/FUNC-007: the seller app has NO /auth routes — auth lives on the
         web app. A same-origin '/auth/login' here 404s. Bounce to the web
         login with an absolute `next` so the user returns to where they were. */
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
        const next = encodeURIComponent(window.location.href);
        window.location.href = `${webUrl}/auth/login?next=${next}`;
      }
      return Promise.reject(refreshError);
    }
  },
);
