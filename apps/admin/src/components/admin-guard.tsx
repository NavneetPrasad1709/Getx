'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuth();

  const onAuthRoute = pathname.startsWith('/auth/');

  useEffect(() => {
    if (loading) return;
    if (onAuthRoute) return;
    if (!isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !ADMIN_ROLES.has(user.role)) {
      router.replace('/auth/login?error=admin_required');
    }
  }, [user, isAuthenticated, loading, pathname, onAuthRoute, router]);

  if (loading && !onAuthRoute) return <div className="min-h-screen" />;
  if (!isAuthenticated && !onAuthRoute) return null;
  if (user && !ADMIN_ROLES.has(user.role) && !onAuthRoute) return null;

  return <>{children}</>;
}
