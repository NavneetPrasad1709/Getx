import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!RAW_API_URL && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_API_URL must be defined at build time in production. ' +
      'Set it in the Vercel project env so the client does not silently fall ' +
      'back to localhost:4000.',
  );
}
const API_URL = RAW_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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
        window.location.href = '/auth/login';
      }
      return Promise.reject(refreshError);
    }
  },
);
