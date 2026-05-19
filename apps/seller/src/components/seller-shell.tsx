'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from '@getx/ui';
import {
  ArrowUpRight,
  CircleDollarSign,
  Headphones,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  Search,
  Tag,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { Badge, Button, ThemeToggle } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import { useMyConversations } from '@/hooks/use-chat';
import { NotificationBell } from '@/components/notifications/notification-bell';

/* GETX Seller Shell — calmer, simpler chrome.
   ─────────────────────────────────────────────────────────────────────
   - Desktop: slim sticky sidebar, single-tone active state, no nested
     borders or noisy hover states.
   - Mobile: full-viewport sheet that takes over the screen with huge
     tap targets, wallet preview at top, and a single logout pill at
     the bottom. No half-open drawer feel.
*/

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  key?: 'messages';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Selling',
    items: [
      { href: '/listings', label: 'My listings', icon: Tag },
      { href: '/requests', label: 'Open requests', icon: Inbox },
      { href: '/offers', label: 'My offers', icon: ListChecks },
    ],
  },
  {
    label: 'Orders & chat',
    items: [
      { href: '/orders', label: 'Orders', icon: Package },
      { href: '/messages', label: 'Messages', icon: MessageSquare, key: 'messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/wallet', label: 'Wallet', icon: Wallet },
      { href: '/profile', label: 'Profile', icon: UserRound },
    ],
  },
];

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: convs } = useMyConversations(!!user);
  const unreadCount =
    convs?.reduce((sum, c) => sum + (user?.id === c.buyerId ? c.buyerUnread : c.sellerUnread), 0) ??
    0;

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  /* Lock body scroll while the full-screen menu is open so the page
     beneath doesn't rubber-band on iOS. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  /* Close the mobile menu on route change. usePathname returns a new
     string when the user navigates, which is exactly when we want to
     dismiss the sheet. */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading) return <div className="min-h-screen" />;

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
  const sellerWallet = user?.sellerWallet ?? 0;
  const pendingEarnings = user?.pendingEarnings ?? 0;
  const initials = (user?.name ?? user?.email ?? 'S').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─────────── Ambient page gradient ─────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 block dark:hidden"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 50% at 15% -5%, hsl(var(--primary) / 0.08), transparent 60%), linear-gradient(180deg, hsl(220 20% 99%) 0%, hsl(220 18% 97%) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 hidden dark:block"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 50% at 15% -5%, hsl(var(--primary) / 0.12), transparent 60%), linear-gradient(180deg, hsl(222 47% 5%) 0%, hsl(222 47% 4%) 100%)',
        }}
      />

      {/* ════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
          ──────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-surface/70 backdrop-blur-xl border-r border-border flex-col">
        <BrandLogo />
        <WalletPill wallet={sellerWallet} pending={pendingEarnings} />

        <nav className="px-3 mt-2 mb-4 space-y-5 flex-1 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/70 font-bold">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <DesktopNavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href, item.exact)}
                    unreadCount={unreadCount}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-0.5">
          <a
            href={`${webUrl}/contact`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12.5px] text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
          >
            <Headphones className="h-4 w-4" />
            Support
          </a>
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[12px]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px] truncate leading-tight">
                {user?.name ?? 'Seller'}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void logout()}
            className="w-full h-8 text-[11.5px] gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════
          MOBILE FULL-VIEWPORT MENU
          Slides from the right, covers the entire screen including
          status bar safe area. Tap targets sized for thumbs.
          ──────────────────────────────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          menuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        {/* Gradient backdrop fills entire vh */}
        <div
          aria-hidden
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 40% at 50% 0%, hsl(var(--primary) / 0.18), transparent 60%), linear-gradient(180deg, hsl(220 20% 99%) 0%, hsl(220 18% 96%) 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 40% at 50% 0%, hsl(var(--primary) / 0.22), transparent 60%), linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 47% 4%) 100%)',
          }}
        />

        {/* Sheet content — slides in from right */}
        <div
          className={`absolute inset-0 flex flex-col h-[100dvh] transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Top bar — brand + close */}
          <div className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
              <motion.div
                initial={{ rotate: -12, scale: 0.7, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                className="relative h-10 w-10 shrink-0"
              >
                <Image
                  src="/brand/getx-mark.webp"
                  alt="GETX"
                  fill
                  sizes="40px"
                  className="drop-shadow-[0_8px_24px_hsl(var(--primary)/0.55)]"
                />
              </motion.div>
              <span className="font-display font-extrabold text-[17px] tracking-tight">
                GETX <span className="text-primary">Seller</span>
              </span>
            </Link>
            <motion.button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="grid place-items-center h-11 w-11 rounded-full bg-surface ring-1 ring-border hover:bg-muted/30"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </motion.button>
          </div>

          {/* User card */}
          <div className="px-5 mt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface ring-1 ring-border">
              <div className="grid place-items-center h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-[15px] ring-2 ring-surface">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[14px] truncate">{user?.name ?? 'Seller'}</div>
                <div className="text-[12px] text-muted-foreground truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Wallet preview — wider on mobile */}
          <div className="px-5 mt-3">
            <Link
              href="/wallet"
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl p-4 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent ring-1 ring-primary/25 hover:ring-primary/40 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
                  Wallet
                </span>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Available
                  </div>
                  <div className="font-display font-extrabold text-2xl tabular-nums leading-none">
                    ${sellerWallet.toFixed(2)}
                  </div>
                </div>
                <div className="border-l border-primary/15 pl-3">
                  <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Pending
                  </div>
                  <div className="font-display font-extrabold text-2xl tabular-nums leading-none text-foreground/80">
                    ${pendingEarnings.toFixed(2)}
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick action — create listing */}
          <div className="px-5 mt-3">
            <Link
              href="/listings/new"
              onClick={() => setMenuOpen(false)}
              className="
                flex items-center justify-center gap-2
                h-12 rounded-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[14.5px] font-bold tracking-tight
                shadow-[0_8px_22px_-4px_hsl(var(--primary)/0.5)]
                active:translate-y-px transition-all
              "
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
              New listing
            </Link>
          </div>

          {/* Nav — big tap targets, grouped. Each row cascades in with a
              tiny stagger so the menu reveals progressively instead of
              materialising all at once — feels alive and tells the
              user the sheet is loaded. */}
          <nav className="flex-1 overflow-y-auto px-3 mt-4 pb-4 space-y-5">
            {NAV_SECTIONS.map((section, sIdx) => (
              <div key={section.label}>
                <div className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 font-bold">
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item, iIdx) => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);
                    const delay = (sIdx * 2 + iIdx) * 0.04;
                    return (
                      <motion.div
                        key={item.href}
                        initial={menuOpen ? { opacity: 0, x: 24 } : false}
                        animate={menuOpen ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
                        transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`
                            relative flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] transition-all
                            active:scale-[0.98]
                            ${
                              active
                                ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
                                : 'text-foreground/90 hover:bg-muted/30'
                            }
                          `}
                        >
                          {active && (
                            <motion.span
                              layoutId="mobile-nav-pill"
                              className="absolute inset-0 -z-10 rounded-2xl bg-primary/10 ring-1 ring-primary/20"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <Icon
                            className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                            strokeWidth={active ? 2.5 : 2}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.key === 'messages' && unreadCount > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 min-w-6 px-1.5 text-[11px] tabular-nums"
                            >
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-border space-y-1">
              <a
                href={`${webUrl}/how-it-works`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                Seller guide
              </a>
              <a
                href={`${webUrl}/contact`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <Headphones className="h-5 w-5" />
                Support
              </a>
              <a
                href={webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <ArrowUpRight className="h-5 w-5" />
                Switch to buyer view
              </a>
            </div>
          </nav>

          {/* Bottom logout — full width, safe-area aware */}
          <div className="px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border bg-surface/40">
            <button
              type="button"
              onClick={() => void logout()}
              className="
                w-full h-12 rounded-full
                bg-surface ring-1 ring-border
                text-foreground text-[14px] font-semibold
                hover:bg-muted/30 active:bg-muted/40 transition-colors
                inline-flex items-center justify-center gap-2
              "
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── MOBILE HEADER ─────────────────────────────────────────── */}
        <header className="md:hidden sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-9 w-9 shrink-0">
                <Image
                  src="/brand/getx-mark.webp"
                  alt="GETX"
                  fill
                  sizes="36px"
                  priority
                  className="drop-shadow-[0_4px_12px_hsl(var(--primary)/0.40)]"
                />
              </div>
              <span className="font-display font-bold text-[15px]">
                GETX <span className="text-primary">Seller</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
              <motion.button
                type="button"
                onClick={() => setMenuOpen(true)}
                whileTap={{ scale: 0.9 }}
                className="grid place-items-center h-10 w-10 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                aria-label="Open menu"
              >
                <Hamburger open={menuOpen} />
              </motion.button>
            </div>
          </div>
        </header>

        {/* ── DESKTOP HEADER ────────────────────────────────────────── */}
        <header className="hidden md:flex sticky top-0 z-20 border-b border-border bg-surface/70 backdrop-blur-xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search listings, orders, buyers…"
                className="
                  w-full h-9 pl-9 pr-3 rounded-full
                  bg-muted/25 ring-1 ring-transparent
                  text-[13px] text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-primary/35 focus:bg-surface
                  transition-all
                "
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center h-5 px-1.5 rounded border border-border bg-surface text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/wallet"
              className="hidden xl:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-success/10 ring-1 ring-success/20 text-success hover:bg-success/15 transition-colors"
              title="Available balance"
            >
              <CircleDollarSign className="h-4 w-4" strokeWidth={2.25} />
              <span className="font-mono text-[12.5px] font-bold tabular-nums">
                ${sellerWallet.toFixed(2)}
              </span>
            </Link>
            <Link
              href="/listings/new"
              className="
                inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground text-[12.5px] font-bold
                shadow-[0_4px_14px_-3px_hsl(var(--primary)/0.45)]
                hover:-translate-y-px transition-all
              "
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New listing
            </Link>
            <div className="h-6 w-px bg-border mx-1" />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

/* ─────────────────────────── BRAND ───────────────────────────
   Uses the official getx-mark.svg (3D gradient hex token) instead of
   a flat lettermark. The mark gently tilts on hover to feel alive
   without crossing into novelty territory. */
function BrandLogo() {
  return (
    <div className="px-5 pt-5 pb-3">
      <Link href="/" className="group flex items-center gap-2.5">
        <motion.div
          whileHover={{ rotate: -8, scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="relative h-10 w-10 shrink-0"
        >
          <Image
            src="/brand/getx-mark.webp"
            alt="GETX"
            fill
            sizes="40px"
            priority
            className="drop-shadow-[0_6px_18px_hsl(var(--primary)/0.45)]"
          />
        </motion.div>
        <div className="leading-tight">
          <div className="font-display font-extrabold text-[15px] tracking-tight">
            GETX <span className="text-primary">Seller</span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            sell.getx.gg
          </div>
        </div>
      </Link>
    </div>
  );
}

function WalletPill({ wallet, pending }: { wallet: number; pending: number }) {
  return (
    <div className="px-4 pb-2">
      <Link
        href="/wallet"
        className="group block rounded-2xl p-3.5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/20 hover:ring-primary/40 transition-all"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary font-bold">
            Available
          </span>
          <ArrowUpRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="font-display font-extrabold text-[22px] tabular-nums leading-none">
          ${wallet.toFixed(2)}
        </div>
        <div className="mt-2 pt-2 border-t border-primary/15 flex items-center justify-between text-[10.5px]">
          <span className="text-muted-foreground">Pending</span>
          <span className="font-mono font-bold tabular-nums text-foreground/80">
            ${pending.toFixed(2)}
          </span>
        </div>
      </Link>
    </div>
  );
}

function DesktopNavLink({
  item,
  active,
  unreadCount,
}: {
  item: NavItem;
  active: boolean;
  unreadCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all
        ${
          active
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-foreground/85 hover:bg-muted/25 hover:text-foreground'
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
        strokeWidth={active ? 2.5 : 2}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.key === 'messages' && unreadCount > 0 && (
        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px] tabular-nums">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Link>
  );
}

/* Animated hamburger that morphs into an X when the menu opens.
   Three independently animated lines: top tilts down and merges to
   center, middle fades, bottom tilts up and merges. Tells the user
   visually that the same button toggles the menu. */
function Hamburger({ open }: { open: boolean }) {
  const stroke = 2.25;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" aria-hidden>
      <motion.path
        d="M4 7h16"
        animate={open ? { d: 'M5 5 L19 19' } : { d: 'M4 7 L20 7' }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M4 12h16"
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.path
        d="M4 17h16"
        animate={open ? { d: 'M5 19 L19 5' } : { d: 'M4 17 L20 17' }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/* AnimatePresence kept in scope so future detail sheets can use it
   without re-importing. */
void AnimatePresence;
