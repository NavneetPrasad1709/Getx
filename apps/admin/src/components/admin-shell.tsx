'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ThemeToggle } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/', label: 'Dashboard', exact: true },
  { href: '/users', label: 'Users' },
  { href: '/orders', label: 'Orders' },
  { href: '/listings', label: 'Listings' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/audit-logs', label: 'Audit Logs' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (loading) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen flex">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r z-40 transition-transform flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b">
          <Link href="/" className="flex items-end gap-2">
            <span className="font-display text-2xl font-bold text-primary">GETX</span>
            <span className="text-xs text-error font-bold pb-1">ADMIN</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t bg-card">
          <div className="text-sm">
            <div className="font-medium truncate">{user?.name ?? 'Admin'}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout()} className="w-full mt-3">
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b bg-card flex items-center justify-between p-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-xl"
          >
            ☰
          </button>
          <span className="font-display font-bold">Admin</span>
          <ThemeToggle />
        </header>

        <header className="hidden md:flex border-b bg-card items-center justify-between p-4">
          <h1 className="text-sm text-muted-foreground">admin.getx.gg</h1>
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
