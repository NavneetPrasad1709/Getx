'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  FileWarning,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  Package,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Badge, Button, ThemeToggle, motion } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAlertsCounts } from '@/hooks/use-admin';

/* GETX Admin Shell.
   ─────────────────────────────────────────────────────────────────────
   Same visual system as the seller shell, sharpened with admin-only
   signals:
     • Danger-red ADMIN brand tag — never mistake the tab for buyer mode
     • Sidebar nav with live alert badges on Orders + Listings + Reviews
     • Full-vh mobile menu
     • Top search (placeholder) + theme toggle
*/

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  alertKey?: 'disputes' | 'pendingListings' | 'hiddenReviews';
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
    label: 'Moderation',
    items: [
      { href: '/orders', label: 'Orders', icon: Package, alertKey: 'disputes' },
      { href: '/listings', label: 'Listings', icon: Tag, alertKey: 'pendingListings' },
      { href: '/reviews', label: 'Reviews', icon: Star, alertKey: 'hiddenReviews' },
    ],
  },
  {
    label: 'Identity',
    items: [{ href: '/users', label: 'Users', icon: Users }],
  },
  {
    label: 'System',
    items: [
      { href: '/audit-logs', label: 'Audit logs', icon: ScrollText },
      { href: '/security', label: 'Security', icon: ShieldCheck },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { data: counts } = useAdminAlertsCounts();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading) return <div className="min-h-screen" />;

  const initials = (user?.name ?? user?.email ?? 'A').slice(0, 2).toUpperCase();
  const totalAlerts = counts
    ? counts.disputes + counts.pendingListings + counts.removedListings + counts.hiddenReviews
    : 0;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Ambient gradient — slight error-tinted bloom so admin always
          feels distinct from seller/buyer apps. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 block dark:hidden"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 15% -5%, hsl(var(--error) / 0.06), transparent 60%), linear-gradient(180deg, hsl(220 20% 99%) 0%, hsl(220 18% 97%) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 hidden dark:block"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 15% -5%, hsl(var(--error) / 0.10), transparent 60%), linear-gradient(180deg, hsl(222 47% 5%) 0%, hsl(222 47% 4%) 100%)',
        }}
      />

      {/* ── DESKTOP SIDEBAR ────────────────────────────────────────── */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-surface/70 backdrop-blur-xl border-r border-border flex-col">
        <Brand />
        <AlertSummary totalAlerts={totalAlerts} />

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
                    alertCount={item.alertKey ? (counts?.[item.alertKey] ?? 0) : 0}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-error/30 to-primary/30 text-foreground font-bold text-[12px]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px] truncate leading-tight">
                {user?.name ?? 'Admin'}
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
            Sign out
          </Button>
        </div>
      </aside>

      {/* ── MOBILE FULL-VH MENU ────────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        <div
          aria-hidden
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 40% at 50% 0%, hsl(var(--error) / 0.16), transparent 60%), linear-gradient(180deg, hsl(220 20% 99%) 0%, hsl(220 18% 96%) 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 40% at 50% 0%, hsl(var(--error) / 0.20), transparent 60%), linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 47% 4%) 100%)',
          }}
        />
        <div
          className={`absolute inset-0 flex flex-col h-[100dvh] transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
              <div className="relative h-10 w-10 shrink-0">
                <Image
                  src="/brand/getx-mark.webp"
                  alt="GETX"
                  fill
                  sizes="40px"
                  priority
                  className="drop-shadow-[0_8px_24px_hsl(var(--primary)/0.55)]"
                />
              </div>
              <span className="font-display font-extrabold text-[17px] tracking-tight">
                GETX <span className="text-error font-black">ADMIN</span>
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

          <div className="px-5 mt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface ring-1 ring-border">
              <div className="grid place-items-center h-12 w-12 rounded-full bg-gradient-to-br from-error/30 to-primary/30 text-foreground font-bold text-[15px] ring-2 ring-surface">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[14px] truncate">{user?.name ?? 'Admin'}</div>
                <div className="text-[12px] text-muted-foreground truncate">{user?.email}</div>
              </div>
            </div>
          </div>

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
                    const alertCount = item.alertKey ? (counts?.[item.alertKey] ?? 0) : 0;
                    const delay = (sIdx * 2 + iIdx) * 0.04;
                    return (
                      <motion.div
                        key={item.href}
                        initial={menuOpen ? { opacity: 0, x: 24 } : false}
                        animate={{ opacity: 1, x: 0 }}
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
                          <Icon
                            className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                            strokeWidth={active ? 2.5 : 2}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {alertCount > 0 && (
                            <Badge variant="default" className="h-5 min-w-6 px-1.5 text-[11px] tabular-nums bg-error text-error-foreground">
                              {alertCount > 99 ? '99+' : alertCount}
                            </Badge>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border bg-surface/40">
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full h-12 rounded-full bg-surface ring-1 ring-border text-foreground text-[14px] font-semibold hover:bg-muted/30 transition-colors inline-flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
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
                GETX <span className="text-error">ADMIN</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <motion.button
                type="button"
                onClick={() => setMenuOpen(true)}
                whileTap={{ scale: 0.9 }}
                className="relative grid place-items-center h-10 w-10 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                aria-label="Open menu"
              >
                <Hamburger />
                {totalAlerts > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error ring-2 ring-surface animate-pulse" />
                )}
              </motion.button>
            </div>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex sticky top-0 z-20 border-b border-border bg-surface/70 backdrop-blur-xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search users, orders, listings…"
                className="w-full h-9 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-error/40 focus:bg-surface transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <div className="hidden xl:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-error/10 ring-1 ring-error/25 text-error">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inset-0 rounded-full bg-error opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-error" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold">
                  {totalAlerts} need action
                </span>
              </div>
            )}
            <div className="h-6 w-px bg-border mx-1" />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

/* ─────────────────────────── BRAND ─────────────────────────── */
function Brand() {
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
            GETX <span className="text-error font-black">ADMIN</span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            admin.getx.live
          </div>
        </div>
      </Link>
    </div>
  );
}

/* Sidebar mini-summary — quick glance at total alerts. */
function AlertSummary({ totalAlerts }: { totalAlerts: number }) {
  return (
    <div className="px-4 pb-2">
      <div
        className={`block rounded-2xl p-3.5 ring-1 transition-colors ${
          totalAlerts > 0
            ? 'bg-gradient-to-br from-error/12 via-error/5 to-transparent ring-error/25'
            : 'bg-gradient-to-br from-success/10 via-success/4 to-transparent ring-success/20'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`font-mono text-[9px] uppercase tracking-[0.22em] font-bold ${
              totalAlerts > 0 ? 'text-error' : 'text-success'
            }`}
          >
            {totalAlerts > 0 ? 'Action queue' : 'All clear'}
          </span>
          {totalAlerts > 0 ? (
            <AlertTriangle className="h-3 w-3 text-error" strokeWidth={2.5} />
          ) : (
            <ShieldAlert className="h-3 w-3 text-success" strokeWidth={2.5} />
          )}
        </div>
        <div className="font-display font-extrabold text-[22px] tabular-nums leading-none">
          {totalAlerts}
        </div>
        <div className="text-[10.5px] text-muted-foreground mt-1">
          {totalAlerts > 0 ? 'Items need attention' : 'Nothing flagged'}
        </div>
      </div>
    </div>
  );
}

function DesktopNavLink({
  item,
  active,
  alertCount,
}: {
  item: NavItem;
  active: boolean;
  alertCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all
        ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/85 hover:bg-muted/25 hover:text-foreground'}
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
      {alertCount > 0 && (
        <Badge
          variant="default"
          className="h-5 min-w-5 px-1.5 text-[10px] tabular-nums bg-error text-error-foreground"
        >
          {alertCount > 99 ? '99+' : alertCount}
        </Badge>
      )}
    </Link>
  );
}

function Hamburger() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

/* Silence unused icons reserved for later. */
void ArrowUpRight;
void ClipboardList;
void FileWarning;
void MessageSquareWarning;
void UserRound;
