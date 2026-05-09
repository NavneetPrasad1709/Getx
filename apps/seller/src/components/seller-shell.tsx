'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ThemeToggle } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/', label: 'Dashboard', exact: true },
  { href: '/listings', label: 'My Listings' },
  { href: '/requests', label: 'Open Requests' },
  { href: '/offers', label: 'My Offers' },
  { href: '/orders', label: 'Orders' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/profile', label: 'Profile' },
];

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (loading) return <div className="min-h-screen" />;

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r z-40 transition-transform flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b">
          <Link href="/" className="flex items-end gap-2">
            <span className="font-display text-2xl font-bold text-primary">GETX</span>
            <span className="text-xs text-muted-foreground pb-1">Seller</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
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
            <div className="font-medium truncate">{user?.name ?? 'Seller'}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <div className="flex gap-2 mt-3 items-center">
            <Button variant="outline" size="sm" onClick={() => void logout()} className="flex-1">
              Logout
            </Button>
            <a
              href={webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ↗ Buy mode
            </a>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-xl"
              aria-label="Open menu"
            >
              ☰
            </button>
            <span className="font-display font-bold">GETX Seller</span>
            <ThemeToggle />
          </div>
        </header>

        <header className="hidden md:flex border-b bg-card items-center justify-between p-4">
          <h2 className="text-sm text-muted-foreground">sell.getx.gg</h2>
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
