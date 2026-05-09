'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: string;
  country: string;
  emailVerified: string | null;
  phoneVerified: string | null;
  kycLevel: string;
  kycStatus: string;
  avatar: string | null;
  isSeller: boolean;
  sellerRating: number;
  verifiedTier: string | null;
  buyerWallet: number;
  sellerWallet: number;
  pendingEarnings: number;
  totalSales: number;
  onboardingCompleted: boolean;
  createdAt: string;
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

  // Bootstrap auth probe via native fetch — same pattern as web app —
  // so a 401 here never re-enters the axios interceptor's redirect path.
  const refetch = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as AuthUser;
        setUser(data);
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
