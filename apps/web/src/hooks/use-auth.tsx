'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

// Same-origin via Next.js proxy — avoids Safari ITP blocking cross-site cookies.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  country: string;
  emailVerified: string | null;
  kycLevel: string;
  kycStatus: string;
  avatar: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Use native fetch (NOT the axios `api` client) so the 401 from a
  // logged-out visitor on a public page never enters the interceptor's
  // refresh-and-retry path. This is the single bootstrap auth probe;
  // every other authenticated request still goes through `api`.
  const refetch = async () => {
    try {
      /* /auth/session is the soft sibling of /auth/me — always returns
         200 with { user: AuthUser | null } so an anonymous landing
         doesn't surface a red 401 in DevTools (Lighthouse Best
         Practices used to ding us for it). Authenticated downstream
         requests still hit /auth/me / /auth/refresh which 401 on
         expiry as before. */
      const res = await fetch(`${API_URL}/auth/session`, { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { user: AuthUser | null };
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if revoke fails, clear local state.
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, refetch, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
