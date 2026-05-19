'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Heart, MessageCircle, User, type LucideProps } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMyConversations } from '@/hooks/use-chat';
import { useWishlist } from '@/hooks/use-wishlist';
import { useWallet } from '@/hooks/use-wallet';
import { formatMoneyCompact } from '@/lib/currency';

/* MobileBottomNav — Jio-style 5-tab dock.

   Lives at the bottom of the viewport on phones only. Hides on auth pages,
   admin pages, and any path the parent passes as `hideOn`. Tabs derive their
   active state from the URL with a simple "starts-with" check tuned per tab
   (e.g. Browse stays lit on any /games/* path). */

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  /** Override for active match — defaults to startsWith(href). */
  isActive?: (path: string) => boolean;
  /** Use external sellerUrl env var instead of next/link. */
  external?: boolean;
}

function home(path: string) {
  return path === '/' || path === '';
}

function browse(path: string) {
  return path.startsWith('/games');
}

function chat(path: string) {
  return path.startsWith('/messages') || path.startsWith('/chat');
}

function wishlist(path: string) {
  return path.startsWith('/profile/wishlist') || path.startsWith('/wishlist');
}

function profile(path: string) {
  return (
    (path.startsWith('/profile') && !wishlist(path)) || path.startsWith('/orders')
  );
}

const HIDE_ON_PREFIXES = ['/auth/', '/admin/'];

interface BadgeMap {
  chat?: number;
  wishlist?: number;
  you?: number;
}

export function MobileBottomNav() {
  const pathname = usePathname() || '/';
  const { isAuthenticated, user } = useAuth();
  const { data: convs } = useMyConversations(isAuthenticated);
  const { count: wishlistCount } = useWishlist();
  const { data: wallet } = useWallet(isAuthenticated);

  const unreadChat =
    convs?.reduce(
      (s, c) => s + (user?.id === c.buyerId ? c.buyerUnread : c.sellerUnread),
      0,
    ) ?? 0;

  if (HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  /* "You" tab shows the wallet balance as a compact pill when non-zero —
     surfaces GETX Coins where the buyer already taps for profile. */
  const walletBalance = wallet?.balance ?? 0;
  const walletCurrency = wallet?.ledger?.[0]?.currency ?? 'USD';

  const badges: BadgeMap = {
    chat: unreadChat,
    wishlist: wishlistCount,
    you: walletBalance > 0 ? Math.floor(walletBalance) : 0,
  };

  // Standard marketplace 5-tab dock — Home / Browse / Wishlist / Chat / You.
  // "Sell on GETX" lives in the header announcement strip + tier 3
  // category bar, so we use this slot for the higher-traffic buyer
  // pattern (wishlist).
  const tabs: Tab[] = [
    { href: '/', label: 'Home', icon: Home, isActive: home },
    { href: '/games', label: 'Browse', icon: Compass, isActive: browse },
    {
      href: isAuthenticated ? '/profile/wishlist' : '/auth/login?next=/profile/wishlist',
      label: 'Wishlist',
      icon: Heart,
      isActive: wishlist,
    },
    {
      href: isAuthenticated ? '/messages' : '/auth/login?next=/messages',
      label: 'Chat',
      icon: MessageCircle,
      isActive: chat,
    },
    {
      href: isAuthenticated ? '/profile' : '/auth/login',
      label: 'You',
      icon: User,
      isActive: profile,
    },
  ];

  return (
    <>
      {/* Spacer so fixed nav never sits on top of page content/buy bars.
          Pages with their own bottom-pinned bars (mobile-buy-bar) account
          for this height when they position themselves. */}
      <div aria-hidden className="md:hidden h-[calc(env(safe-area-inset-bottom)+64px)]" />

      <nav
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-2xl shadow-[0_-20px_60px_-30px_hsl(var(--primary-glow)/0.35)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex h-16 items-stretch">
          {tabs.map((tab) => {
            const active = tab.isActive
              ? tab.isActive(pathname)
              : pathname.startsWith(tab.href) && tab.href !== '/';

            const badge =
              tab.label === 'Chat'
                ? badges.chat
                : tab.label === 'Wishlist'
                  ? badges.wishlist
                  : tab.label === 'You'
                    ? badges.you
                    : 0;

            /* "You" gets a currency pill instead of a count. */
            const isWalletBadge = tab.label === 'You' && (badge ?? 0) > 0;

            const inner = (
              <>
                <div className="relative">
                  <tab.icon
                    className={`h-[22px] w-[22px] transition-colors duration-ui ease-apple ${
                      active ? 'text-primary' : 'text-foreground/75'
                    }`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {badge && badge > 0 ? (
                    isWalletBadge ? (
                      <span
                        aria-hidden
                        className="absolute -top-1.5 -right-3 min-w-[26px] h-4 px-1.5 rounded-full bg-[hsl(var(--success))] text-white text-[9px] font-bold leading-none grid place-items-center tabular-nums shadow-[0_0_10px_hsl(var(--success)/0.45)]"
                      >
                        {formatMoneyCompact(badge ?? 0, walletCurrency)}
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-hot text-hot-foreground text-[9px] font-bold leading-none grid place-items-center shadow-[0_0_10px_hsl(var(--hot)/0.6)]"
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )
                  ) : null}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide transition-colors duration-ui ease-apple ${
                    active ? 'text-primary' : 'text-foreground/75'
                  }`}
                >
                  {tab.label}
                </span>
                {/* Active indicator pill */}
                <span
                  aria-hidden
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-ui ease-apple ${
                    active ? 'w-8 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]' : 'w-0 bg-transparent'
                  }`}
                />
              </>
            );

            const cls =
              'group relative flex flex-1 flex-col items-center justify-center gap-1 px-1 select-none active:scale-95 transition-transform duration-micro';

            return (
              <li key={tab.label} className="flex flex-1">
                {tab.external ? (
                  <a href={tab.href} className={cls} aria-current={active ? 'page' : undefined}>
                    {inner}
                  </a>
                ) : (
                  <Link
                    href={tab.href}
                    className={cls}
                    aria-current={active ? 'page' : undefined}
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
