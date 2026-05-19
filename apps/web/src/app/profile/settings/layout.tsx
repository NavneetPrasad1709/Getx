'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  BadgeCheck,
  Bell,
  CreditCard,
  MapPin,
  Lock,
  User,
  type LucideProps,
} from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';

/* Settings shell — desktop sidebar nav + mobile top scroll-tabs.

   The sidebar pins on `lg+` and reflects the active subpage. Mobile gets
   the same list as a horizontally-scrolling chip rail above the content.
   Every subpage renders inside the `<main>` slot and inherits this
   header/footer + auth guard. */

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<LucideProps>;
}

const NAV: NavItem[] = [
  {
    href: '/profile/settings',
    label: 'Overview',
    description: 'Account at a glance',
    icon: User,
  },
  {
    href: '/profile/settings/security',
    label: 'Security',
    description: 'Password + 2FA',
    icon: Lock,
  },
  {
    href: '/profile/settings/kyc',
    label: 'KYC verification',
    description: 'ID + selfie via Sumsub',
    icon: BadgeCheck,
  },
  {
    href: '/profile/settings/notifications',
    label: 'Notifications',
    description: 'Email / push / SMS',
    icon: Bell,
  },
  {
    href: '/profile/settings/payment-methods',
    label: 'Payment methods',
    description: 'Saved cards & wallets',
    icon: CreditCard,
  },
  {
    href: '/profile/settings/addresses',
    label: 'Addresses',
    description: 'Billing + tax ID',
    icon: MapPin,
  },
  {
    href: '/profile/settings/privacy',
    label: 'Privacy',
    description: 'Data export · Delete',
    icon: ShieldCheck,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const { isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.assign(
        '/auth/login?next=' + encodeURIComponent(pathname),
      );
    }
  }, [loading, isAuthenticated, pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-6xl pt-24 pb-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <Link href="/profile" className="hover:text-foreground">
            Profile
          </Link>
          <span aria-hidden className="mx-2">·</span>
          <span className="text-foreground">Settings</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
          Settings
        </h1>

        {/* Mobile rail */}
        <nav
          aria-label="Settings sections"
          className="lg:hidden -mx-3 mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex items-center gap-1.5 px-3 w-max">
            {NAV.map((item) => {
              const active =
                item.href === '/profile/settings'
                  ? pathname === '/profile/settings'
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground)/0.75)] hover:bg-[hsl(var(--surface-elevated))]'
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8 lg:gap-10">
          {/* Desktop sidebar */}
          <aside
            aria-label="Settings sections"
            className="hidden lg:block self-start sticky top-24"
          >
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active =
                  item.href === '/profile/settings'
                    ? pathname === '/profile/settings'
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        active
                          ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                          : 'text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface))]'
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          active
                            ? 'text-[hsl(var(--primary))]'
                            : 'text-[hsl(var(--muted-foreground))]'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold">
                          {item.label}
                        </div>
                        <div className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Content */}
          <section className="min-w-0">{children}</section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
