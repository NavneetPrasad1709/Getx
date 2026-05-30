import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

// In production the web app proxies API requests through Next.js rewrites
// (next.config.mjs `rewrites`) so every fetch is same-origin.  This avoids
// Safari ITP blocking cross-site cookies.  The env var is kept as an escape
// hatch for local dev where you may want to hit the API directly.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  /* 15s ceiling — the default is infinite, which lets a hung Railway
     request hold the browser's connection pool open forever. Anything
     legitimately slower than this (data export, big report) should
     stream or move to a background job. */
  timeout: 15_000,
});

// Pages that must NEVER bounce visitors to /auth/login when /auth/me 401s.
const PUBLIC_EXACT = new Set<string>([
  '/',
  '/games',
  '/about',
  '/how-it-works',
  '/trust',
  '/careers',
  '/terms',
  '/privacy',
  '/refund',
  '/contact',
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/games/')) return true;
  return false;
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

    // Probes — never trigger refresh-and-retry.
    // /auth/me is the bootstrap auth check (401 here is expected for visitors).
    // /auth/refresh is the refresh itself; retrying would loop.
    // /auth/login + /auth/logout don't carry a session to refresh.
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

      // Only kick visitors to login when they were actually on a protected page.
      // On public pages (landing, marketing, browse) just propagate the 401
      // and let the caller decide what to render.
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        // WEB-MED-014: preserve current path so buyer mid-checkout doesn't lose their place
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?next=${next}`;
      }
      return Promise.reject(refreshError);
    }
  },
);
