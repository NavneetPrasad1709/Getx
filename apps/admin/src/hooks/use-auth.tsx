'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

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

  const refetch = async () => {
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(data);
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
