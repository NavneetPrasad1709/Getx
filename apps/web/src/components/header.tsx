'use client';

import Link from 'next/link';
import { Button, ThemeToggle } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';

export function Header() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'http://localhost:3001';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-primary">GETX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/games" className="hover:text-primary transition-colors">
            Games
          </Link>
          <Link href="/how-it-works" className="hover:text-primary transition-colors">
            How it works
          </Link>
          <Link href="/trust" className="hover:text-primary transition-colors">
            Trust &amp; Safety
          </Link>
          <a href={sellerUrl} className="hover:text-primary transition-colors">
            Sell on GETX
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {loading ? (
            <div className="h-9 w-20 bg-muted/30 animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile/orders"
                className="hidden sm:inline text-sm hover:text-primary transition-colors"
              >
                My Orders
              </Link>
              <Link
                href="/profile/requests"
                className="hidden sm:inline text-sm hover:text-primary transition-colors"
              >
                My Requests
              </Link>
              <span className="hidden sm:inline text-sm text-muted-foreground">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
