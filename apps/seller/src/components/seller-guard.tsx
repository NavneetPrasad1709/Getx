'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const PUBLIC_PREFIX = '/auth/';

export function SellerGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  const isPublic = pathname.startsWith(PUBLIC_PREFIX);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isPublic) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, loading, isPublic, pathname, router]);

  if (loading) return <div className="min-h-screen" />;
  if (!isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
