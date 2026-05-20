import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!RAW_API_URL && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_API_URL must be defined at build time in production.',
  );
}
const API_URL = RAW_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        window.location.href = '/auth/login';
      }
      return Promise.reject(refreshError);
    }
  },
);
