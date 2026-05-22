'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@getx/ui';
import {
  Search,
  Menu,
  X,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Package,
  Coins,
  Command,
  CornerDownLeft,
  Gamepad2,
  Sword,
  Headphones,
  Globe,
  MessageCircle,
  Zap,
  Sparkles,
  LogOut,
  Wallet,
  ShoppingBag,
  TrendingUp,
  Bell,
  Settings,
  Star,
} from 'lucide-react';
import { IconTabs, type IconTab } from '@/components/ui/icon-tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useMyConversations } from '@/hooks/use-chat';
import { useWallet } from '@/hooks/use-wallet';
import { useLoyalty } from '@/hooks/use-loyalty';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { CommandPalette, useCommandPalette } from '@/components/command-palette';
import { formatMoney, formatMoneyCompact } from '@/lib/currency';
import {
  useSearchListings,
  useSearchSellers,
  useSearchGames,
} from '@/hooks/use-search';

/* Header — pro marketplace pattern (Eldorado / ZeusX hybrid).

   Three-tier:
   1. Top announcement strip (slim) — launch announcement + 24/7 help + locale
   2. Main bar — logo + giant search w/ category dropdown + utility cluster
      (theme, notif, msgs, sign-in / avatar dropdown)
   3. Category nav strip — Accounts / Items / Top-ups / Coins / Boosting

   Sticky behaviour: top strip can hide on scroll; main bar + category nav
   condense into a single sticky pill. Mobile collapses to a hamburger
   drawer. */

interface HeaderCategory {
  id: string;
  href: string;
  icon: IconTab['icon'];
  label: string;
  isNew?: boolean;
}

/* Header nav — only categories that resolve to a real, populated page.
   "Game Coins" was a dupe of "Top-ups" (same URL, same listings),
   "Gift Cards" had no product type to back it. Both pruned to avoid
   nav links that deliver an empty grid or a duplicate destination. */
const CATEGORIES: HeaderCategory[] = [
  { id: 'accounts', href: '/games/pokemon-go/accounts', icon: User, label: 'Accounts' },
  { id: 'items', href: '/games/pokemon-go/items', icon: Package, label: 'In-Game Items' },
  { id: 'topups', href: '/games/pokemon-go/top-ups', icon: Coins, label: 'Top-ups' },
  { id: 'boosting', href: '/games/pokemon-go/boosting', icon: Sword, label: 'Boosting' },
  { id: 'allgames', href: '/games', icon: Gamepad2, label: 'All games' },
];

const SECONDARY = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/contact', label: 'Contact' },
];

/* Rotating announcements for the Tier-1 strip. Each tick swaps between
   them with a smooth fade so the bar reads as "live." Keep copy short
   (~50 chars) so it fits without truncation on most viewports. */
interface Announcement {
  /* Color of the leading status dot */
  dotColor: string;
  /* Rendered as React node so we can inline brand chips */
  content: React.ReactNode;
}

/* Header announcements — operational promises only.
   Removed fake counts ("184 drops shipped today", "240+ verified drops",
   "★ 4.9 average · 2,847 reviews", "$0 chargebacks all-time") since none
   of those numbers are real at launch. Replaced with verifiable claims
   and product-status callouts. */
const ANNOUNCEMENTS: Announcement[] = [
  {
    dotColor: '#10B981',
    content: (
      <>
        <span className="font-bold text-white">Pokémon GO is live</span>
        <span className="hidden sm:inline text-white/55 mx-1.5">·</span>
        <span className="hidden sm:inline text-white/85">Verified seller marketplace</span>
      </>
    ),
  },
  {
    dotColor: '#FCAF17',
    content: (
      <>
        <span className="font-bold text-white">Same-day delivery</span>
        <span className="hidden sm:inline text-white/55 mx-1.5">·</span>
        <span className="hidden sm:inline text-white/85">Most drops ship within minutes</span>
      </>
    ),
  },
  {
    dotColor: '#5AC8F2',
    content: (
      <>
        <span className="font-bold text-white">Roblox / Genshin / Valorant</span>
        <span className="hidden sm:inline text-white/55 mx-1.5">·</span>
        <span className="hidden sm:inline text-white/85">Launching soon — join the waitlist</span>
      </>
    ),
  },
  {
    dotColor: '#A78BFA',
    content: (
      <>
        <span className="font-bold text-white">Sumsub-verified sellers</span>
        <span className="hidden sm:inline text-white/55 mx-1.5">·</span>
        <span className="hidden sm:inline text-white/85">Government-ID checks on every account</span>
      </>
    ),
  },
  {
    dotColor: '#FF4D4D',
    content: (
      <>
        <span className="font-bold text-white">100% escrow protected</span>
        <span className="hidden sm:inline text-white/55 mx-1.5">·</span>
        <span className="hidden sm:inline text-white/85">3-day refund window on every order</span>
      </>
    ),
  },
];

/* Fixed particle positions for the strip — kept tiny so animation
   stays cheap. */
const PROMO_PARTICLES = [
  { left: '8%', delay: 0 },
  { left: '24%', delay: 1.5 },
  { left: '46%', delay: 3 },
  { left: '64%', delay: 0.6 },
  { left: '82%', delay: 2.2 },
];

/* --------------------------- search autocomplete data --------------------------- */

const TRENDING_SEARCHES = [
  'Lv 50 Hundo Mewtwo',
  'Shiny Charizard',
  '14,500 PokéCoins',
  'Master League boost',
  'Raid pass bundle',
  'Valor Lv 48',
];

interface SearchGame {
  title: string;
  href: string;
  status: 'live' | 'soon';
  detail: string;
}

interface SearchListing {
  title: string;
  href: string;
  category: string;
  price: number;
}

interface SearchSeller {
  handle: string;
  href: string;
  rating: string;
  orders: number;
}

interface SearchOption {
  id: string;
  href: string;
}

interface SearchResults {
  games: SearchGame[];
  listings: SearchListing[];
  sellers: SearchSeller[];
  flat: SearchOption[];
}

const EMPTY_SEARCH_RESULTS: SearchResults = {
  games: [],
  listings: [],
  sellers: [],
  flat: [],
};

function tabSegment(tab: string): string {
  if (tab === 'TOP_UPS') return 'top-ups';
  if (tab === 'ITEMS') return 'items';
  return 'accounts';
}
function tabCategory(tab: string): string {
  if (tab === 'TOP_UPS') return 'Top-ups';
  if (tab === 'ITEMS') return 'Items';
  return 'Accounts';
}

export function Header() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'http://localhost:3001';
  const { data: convs } = useMyConversations(isAuthenticated);
  const { data: wallet } = useWallet(isAuthenticated);
  const { data: loyalty } = useLoyalty(isAuthenticated);
  const walletCurrency = wallet?.ledger?.[0]?.currency ?? 'USD';
  const unread =
    convs?.reduce(
      (s, c) => s + (user?.id === c.buyerId ? c.buyerUnread : c.sellerUnread),
      0,
    ) ?? 0;
  const { open, setOpen } = useCommandPalette();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [acctOpen, setAcctOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const searchRef = React.useRef<HTMLDivElement>(null);

  /* Debounce the query so we don't fire an API call on every keystroke.
     250ms matches the cadence used on /search itself. */
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  /* Live federated search — only fires when the dropdown is open and
     the query is non-trivial. Each hook is independent so a single
     failure doesn't blank the panel. */
  const wantsResults = searchOpen && debouncedQuery.length >= 2;
  const liveListings = useSearchListings(debouncedQuery, wantsResults);
  const liveSellers = useSearchSellers(debouncedQuery, wantsResults);
  const liveGames = useSearchGames(debouncedQuery, wantsResults);
  const searchLoading =
    wantsResults &&
    (liveListings.isFetching || liveSellers.isFetching || liveGames.isFetching);

  const searchResults = React.useMemo<SearchResults>(() => {
    if (!wantsResults) return EMPTY_SEARCH_RESULTS;

    const games: SearchGame[] = (liveGames.data ?? []).slice(0, 4).map((g) => ({
      title: g.name,
      href: `/games/${g.slug}`,
      status: g.isLaunched ? 'live' : 'soon',
      detail: g.isLaunched
        ? `Live now · ${g.totalListings.toLocaleString()} listings`
        : 'Join the waitlist',
    }));

    const listings: SearchListing[] = (liveListings.data?.data ?? [])
      .slice(0, 5)
      .map((l) => ({
        title: l.title,
        href: l.slug
          ? `/games/${l.game.slug}/${tabSegment(l.tabType)}/${l.slug}`
          : '#',
        category: tabCategory(l.tabType),
        price: l.price,
      }));

    const sellers: SearchSeller[] = (liveSellers.data ?? []).slice(0, 4).map((s) => {
      const handle = s.username ?? s.name ?? 'seller';
      return {
        handle: `@${handle}`,
        href: `/users/${handle}`,
        rating: s.sellerRating.toFixed(2),
        orders: s.totalSales,
      };
    });

    const flat: SearchOption[] = [
      ...games.map((_, i) => ({ id: `hdr-srch-game-${i}`, href: games[i]!.href })),
      ...listings.map((_, i) => ({ id: `hdr-srch-list-${i}`, href: listings[i]!.href })),
      ...sellers.map((_, i) => ({ id: `hdr-srch-sell-${i}`, href: sellers[i]!.href })),
    ];
    return { games, listings, sellers, flat };
  }, [wantsResults, liveGames.data, liveListings.data, liveSellers.data]);

  const activeOption =
    activeIdx >= 0 && activeIdx < searchResults.flat.length
      ? searchResults.flat[activeIdx]
      : null;
  const [promoDismissed, setPromoDismissed] = React.useState(true);
  /* Rotating announcement index — cycles through ANNOUNCEMENTS every
     5 seconds to keep the strip feeling alive. */
  const [announceIdx, setAnnounceIdx] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setAnnounceIdx((i) => (i + 1) % ANNOUNCEMENTS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  /* Lock body scroll when the full-screen mobile drawer is open. */
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  // First-visit incentive — show FIRSTDROP promo until the user dismisses
  // it (persisted in localStorage so it doesn't keep coming back on every
  // route). Mount-only read; later toggles write through.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const flag = window.localStorage.getItem('getx.promo.firstdrop.dismissed');
    setPromoDismissed(flag === '1');
  }, []);

  const dismissPromo = () => {
    setPromoDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('getx.promo.firstdrop.dismissed', '1');
    }
  };

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close any open dropdown on route change
  React.useEffect(() => {
    setAcctOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Click-outside + escape — close search autocomplete
  React.useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [searchOpen]);

  // Reset active option when query changes or autocomplete closes
  React.useEffect(() => {
    setActiveIdx(-1);
  }, [query, searchOpen]);

  // Scroll active option into view inside the autocomplete panel
  React.useEffect(() => {
    if (!activeOption) return;
    const el = document.getElementById(activeOption.id);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeOption]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setSearchOpen(true);
        e.preventDefault();
      }
      return;
    }
    const total = searchResults.flat.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (total === 0) return;
      setActiveIdx((i) => (i + 1 >= total ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (total === 0) return;
      setActiveIdx((i) => (i <= 0 ? total - 1 : i - 1));
    } else if (e.key === 'Home' && total > 0) {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === 'End' && total > 0) {
      e.preventDefault();
      setActiveIdx(total - 1);
    } else if (e.key === 'Enter' && activeOption) {
      e.preventDefault();
      setSearchOpen(false);
      router.push(activeOption.href);
    }
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    /* All routes go through the federated /search page. Category filtering
       moved to the Tier-3 icon-tabs strip below the search bar, so the
       search input is now pure free-text — cleaner header, less crowded
       input field. */
    const params = new URLSearchParams({ q });
    window.location.assign(`/search?${params.toString()}`);
  };

  return (
    /* Force dark mode across the entire header tree regardless of the
       page theme. `display: contents` strips this wrapper from layout
       so existing sticky / z-index relationships are preserved. */
    <div className="dark contents">
      {/* TIER 1 — top announcement strip.
          - First-time visitors see the FIRSTDROP incentive promo
          - Dismissed users fall back to the launch-status line
          Both collapse on scroll. */}
      <div
        className={`relative z-50 text-white border-b border-white/10 overflow-hidden transition-[height,opacity] duration-300 ${
          promoDismissed
            ? 'bg-[linear-gradient(90deg,#0B0820_0%,#1A1142_50%,#0B0820_100%)]'
            : 'bg-[radial-gradient(120%_120%_at_50%_0%,hsl(var(--primary)/0.85)_0%,#1F1750_55%,#0B0820_100%)]'
        } ${scrolled ? 'h-0 opacity-0' : 'h-10'}`}
      >
        {/* Shimmer sweep — bright line crosses the bar every ~8 s */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="getx-promo-shimmer absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        </div>

        {/* Floating particles — slow drifting white dots add a sense of
            atmosphere without competing with the message text */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {PROMO_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="getx-promo-particle absolute h-[3px] w-[3px] rounded-full bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.6)]"
              style={{ left: p.left, animationDelay: `${p.delay}s` }}
            />
          ))}
        </div>

        {/* Subtle noise overlay (promo only) */}
        {!promoDismissed ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
              backgroundSize: '160px 160px',
            }}
          />
        ) : null}

        {/* Scoped CSS for keyframes */}
        <style>{`
          @keyframes getx-promo-shimmer {
            0%   { transform: translateX(0); }
            100% { transform: translateX(400%); }
          }
          .getx-promo-shimmer {
            animation: getx-promo-shimmer 8s ease-in-out infinite;
          }
          @keyframes getx-promo-float {
            0%   { transform: translateY(0); opacity: 0; }
            20%  { opacity: 0.9; }
            80%  { opacity: 0.9; }
            100% { transform: translateY(-100%); opacity: 0; }
          }
          .getx-promo-particle {
            bottom: 0;
            animation: getx-promo-float 6s ease-in-out infinite;
          }
          @keyframes getx-dot-glow {
            0%, 100% { box-shadow: 0 0 8px currentColor, 0 0 14px currentColor; }
            50%      { box-shadow: 0 0 12px currentColor, 0 0 24px currentColor; }
          }
          .getx-promo-dot {
            animation: getx-dot-glow 2.4s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .getx-promo-shimmer,
            .getx-promo-particle,
            .getx-promo-dot { animation: none; }
          }
        `}</style>

        <div className="relative mx-auto max-w-[1400px] h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 text-[12px]">
          {promoDismissed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0 flex-1 relative">
                {/* Live dot — color shifts per announcement, glow pulses */}
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
                    style={{ backgroundColor: ANNOUNCEMENTS[announceIdx].dotColor }}
                  />
                  <span
                    className="getx-promo-dot relative inline-flex h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: ANNOUNCEMENTS[announceIdx].dotColor,
                      color: ANNOUNCEMENTS[announceIdx].dotColor,
                    }}
                  />
                </span>

                {/* ROTATING ANNOUNCEMENT — cross-fades every 5 seconds */}
                <div className="relative h-5 flex-1 overflow-hidden">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      key={announceIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center whitespace-nowrap"
                    >
                      {ANNOUNCEMENTS[announceIdx].content}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Progress dots — show which announcement is active */}
                <div className="hidden sm:flex items-center gap-1 shrink-0 ml-2">
                  {ANNOUNCEMENTS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAnnounceIdx(i)}
                      aria-label={`Show announcement ${i + 1}`}
                      className={
                        i === announceIdx
                          ? 'h-1 w-3 rounded-full bg-white/85 transition-all duration-300'
                          : 'h-1 w-1 rounded-full bg-white/30 hover:bg-white/50 transition-all duration-300'
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 shrink-0 text-white/90">
                <Link
                  href="/contact"
                  className="
                    inline-flex items-center gap-1.5 h-6 px-2 rounded-full
                    text-white/85 hover:text-white hover:bg-white/10
                    transition-colors
                  "
                >
                  <Headphones className="h-3 w-3" />
                  <span className="font-semibold">24/7 Help</span>
                </Link>
                <span aria-hidden className="h-3 w-px bg-white/15" />
                <button
                  type="button"
                  className="
                    inline-flex items-center gap-1.5 h-6 px-2 rounded-full
                    text-white/85 hover:text-white hover:bg-white/10
                    transition-colors
                  "
                  aria-label="Change locale"
                >
                  <Globe className="h-3 w-3" />
                  <span className="font-mono text-[11px]">EN · USD</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                <Sparkles className="h-3.5 w-3.5 text-white shrink-0 drop-shadow-[0_0_8px_hsl(var(--primary))]" />
                <span className="text-white/90 truncate">
                  <span className="font-bold text-white">5% off your first order</span>
                  <span className="text-white/85"> · use code </span>
                  <span
                    className="
                      inline-flex items-center px-1.5 py-[1px] rounded-[5px]
                      bg-white/[0.14] ring-1 ring-white/30
                      font-mono text-[10.5px] font-bold tracking-[0.08em] text-white
                      shadow-[inset_0_1px_0_hsl(0_0%_100%/0.15)]
                    "
                  >
                    FIRSTDROP
                  </span>
                  <span className="hidden sm:inline text-white/80"> · ends in 7 days</span>
                </span>
              </div>
              <button
                type="button"
                onClick={dismissPromo}
                aria-label="Dismiss promo"
                className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* TIER 2 — main sticky bar with glass-on-scroll. The background uses
          a translucent color + backdrop-blur once the user scrolls, so the
          bar reads as a premium frosted layer rather than a flat slab. */}
      {/* overflow-x-clip (not overflow-hidden) so the ambient backdrop
          stays contained horizontally — keeps the radial blooms from
          bleeding onto neighbouring sections — while still letting
          absolute-positioned children like the account dropdown extend
          vertically below the header. overflow-hidden was clipping the
          dropdown to header height, so users only saw the email/name
          panel, never the menu items below. */}
      <header
        className={`
          relative sticky top-0 z-40 overflow-x-clip
          bg-[hsl(var(--background))] border-b border-[hsl(var(--border))]
          transition-shadow duration-300
          ${scrolled ? 'shadow-[0_8px_28px_-12px_hsl(0_0%_0%/0.12)]' : ''}
        `}
      >
        {/* Cinematic ambient backdrop — soft primary glow on the left,
            accent kiss on the right, subtle dot-grid texture. Sits
            behind all content, doesn't interfere with sticky/blur. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
        >
          {/* Primary radial bloom — drifts slowly */}
          <div className="absolute -left-20 -top-10 h-[180%] w-[55%] bg-[radial-gradient(ellipse_60%_50%_at_30%_50%,hsl(var(--primary)/0.10),transparent_70%)]" />
          {/* Accent kiss right side */}
          <div className="absolute -right-10 -top-10 h-[180%] w-[40%] bg-[radial-gradient(ellipse_50%_60%_at_70%_50%,hsl(var(--accent)/0.05),transparent_70%)]" />
          {/* Faint dot grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage:
                'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
            }}
          />
          {/* Hairline bottom accent */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.30)] to-transparent" />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-[72px] items-center gap-3 sm:gap-4">
            {/* LEFT — logo, flex-1 so it balances against the right cluster
                and the search bar sits truly centered between them. */}
            <div className="flex-1 flex items-center justify-start min-w-0">
              <Link href="/" aria-label="GETX home" className="flex items-center gap-2 shrink-0">
                {/* Light-mode fallback — keeps the old monochrome SVG since
                    the new chrome-3D mark needs a dark backdrop to read.
                    Dark theme gets the premium new asset. */}
                <Image
                  src="/logos/getx-logo-dark.svg"
                  alt="GETX"
                  width={384}
                  height={256}
                  priority
                  sizes="(min-width: 768px) 120px, 100px"
                  className="h-7 md:h-8 w-auto dark:hidden"
                />
                <Image
                  src="/brand/getx-logo.webp"
                  alt="GETX"
                  width={1920}
                  height={640}
                  priority
                  sizes="(min-width: 768px) 140px, 110px"
                  className="h-8 md:h-10 w-auto hidden dark:block"
                />
              </Link>
            </div>

            {/* CENTER — search, fixed max-width pill, no flex-grow so it
                stays a constant size and the flanking flex-1 columns
                center it perfectly. */}
            <div
              ref={searchRef}
              className="group/searchwrap hidden md:block relative w-full max-w-[min(640px,55vw)] shrink"
            >
              {/* Animated outer glow on focus — sits behind the bar, fades in
                  on focus-within (group cascades down to the form input). */}
              <div
                aria-hidden
                className="
                  pointer-events-none absolute -inset-1 rounded-full
                  bg-gradient-to-r from-[hsl(var(--primary)/0)] via-[hsl(var(--primary)/0.35)] to-[hsl(var(--primary)/0)]
                  opacity-0 blur-lg
                  group-focus-within/searchwrap:opacity-100
                  transition-opacity duration-300
                "
              />

              <form
                onSubmit={submitSearch}
                className="
                  relative flex items-center gap-2 h-12 lg:h-[52px]
                  rounded-full
                  bg-gradient-to-b from-[hsl(var(--surface))] to-[hsl(var(--surface-elevated))]
                  ring-1 ring-[hsl(var(--border))]
                  hover:ring-[hsl(var(--foreground)/0.18)]
                  focus-within:ring-2 focus-within:ring-[hsl(var(--primary))]
                  focus-within:shadow-[0_12px_32px_-16px_hsl(var(--primary)/0.55),0_2px_6px_-2px_hsl(0_0%_0%/0.10)]
                  shadow-[0_1px_3px_hsl(0_0%_0%/0.06)]
                  transition-all duration-200
                  pl-1.5 pr-1.5
                "
              >
                {/* Search-icon pill on the left — primary-tinted, gives the
                    bar a clear focal point so it doesn't read as just a
                    rectangle. Tone shifts on focus. */}
                <div
                  className="
                    flex items-center justify-center h-9 w-9 lg:h-10 lg:w-10
                    rounded-full shrink-0
                    bg-[hsl(var(--primary)/0.10)] text-[hsl(var(--primary))]
                    group-focus-within/searchwrap:bg-[hsl(var(--primary)/0.18)]
                    transition-colors duration-200
                  "
                  aria-hidden
                >
                  <Search className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={onSearchKeyDown}
                  type="text"
                  placeholder="Hundo Mewtwo, Lv 50 Mystic, 14,500 PokéCoins…"
                  role="combobox"
                  aria-label="Search GETX"
                  aria-expanded={searchOpen}
                  aria-controls="header-search-autocomplete"
                  aria-autocomplete="list"
                  aria-activedescendant={activeOption?.id}
                  autoComplete="off"
                  className="
                    flex-1 bg-transparent outline-none
                    text-[15px] font-medium text-[hsl(var(--foreground))]
                    placeholder:text-[hsl(var(--muted-foreground))]/65 placeholder:font-normal
                    min-w-0
                  "
                />

                {/* Right-side hint stack — ⌘K when idle, ↵ Enter when typing */}
                {query ? (
                  <kbd
                    aria-hidden
                    className="
                      hidden lg:inline-flex items-center gap-1 h-7 px-2
                      rounded-full bg-[hsl(var(--background))]
                      border border-[hsl(var(--border))]
                      text-[10.5px] font-mono font-medium text-[hsl(var(--muted-foreground))]
                      tracking-tight mr-1
                    "
                  >
                    <CornerDownLeft className="h-3 w-3" />
                    Enter
                  </kbd>
                ) : !searchOpen ? (
                  <kbd
                    aria-hidden
                    className="
                      hidden lg:inline-flex items-center gap-0.5 h-7 px-2
                      rounded-full bg-[hsl(var(--background))]
                      border border-[hsl(var(--border))]
                      text-[10.5px] font-mono font-medium text-[hsl(var(--muted-foreground))]
                      tracking-tight mr-1
                    "
                  >
                    <Command className="h-3 w-3" />K
                  </kbd>
                ) : null}

                {/* Submit pill — rounded-full to match the bar. Gradient +
                    inner highlight + lift on hover. */}
                <button
                  type="submit"
                  aria-label="Search"
                  className="
                    inline-flex items-center justify-center gap-1.5
                    h-9 lg:h-10 px-4 lg:px-5
                    rounded-full
                    bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))]
                    text-white text-[13.5px] font-semibold tracking-tight
                    shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.22),inset_0_-2px_0_hsl(0_0%_0%/0.15)]
                    hover:-translate-y-px hover:from-[hsl(var(--primary-hover))] hover:to-[hsl(var(--primary))]
                    active:translate-y-0 active:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.40),inset_0_1px_0_hsl(0_0%_100%/0.10)]
                    transition-all duration-150 shrink-0
                  "
                >
                  <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span className="hidden lg:inline">Search</span>
                </button>
              </form>

              {/* Autocomplete panel */}
              {searchOpen ? (
                <SearchAutocomplete
                  results={searchResults}
                  query={query}
                  activeId={activeOption?.id}
                  loading={searchLoading}
                  onSelectTrending={(t) => setQuery(t)}
                  onClose={() => setSearchOpen(false)}
                />
              ) : null}
            </div>

            {/* Mobile-only search trigger */}
            <button
              onClick={() => setOpen(true)}
              aria-label="Search"
              className="md:hidden ml-auto h-11 w-11 grid place-items-center rounded-full bg-[hsl(var(--surface-elevated))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-colors"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* RIGHT — utility cluster, flex-1 so its outer edge mirrors
                the logo column. justify-end pins everything to the right.
                ThemeToggle has moved to Tier 3 (CategoryStrip) — this
                keeps Tier 2 focused on identity (logo), search, and
                account/wallet actions only. */}
            <div className="flex-1 hidden md:flex items-center justify-end gap-1.5 min-w-0 shrink-0">
              {/* "Sell on GETX" — text-only secondary action so the
                  cluster doesn't compete with the primary "Get started"
                  CTA. Soft accent on hover. Hidden below xl when space
                  is tight; mobile drawer keeps the link reachable. */}
              <a
                href={sellerUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sell on GETX (opens seller dashboard)"
                className="
                  group hidden xl:inline-flex items-center gap-1 h-10 px-3 rounded-full whitespace-nowrap shrink-0
                  text-[hsl(var(--foreground)/0.85)] text-[13px] font-semibold
                  hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.08)]
                  transition-colors duration-150
                "
              >
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))] transition-transform group-hover:rotate-12" />
                Sell on GETX
                <ArrowUpRight className="h-3 w-3 opacity-60" />
              </a>
              {loading ? (
                <div className="h-10 w-24 rounded-full bg-[hsl(var(--surface-elevated))] animate-pulse" />
              ) : isAuthenticated ? (
                <div className="flex items-center gap-1">
                  {wallet && wallet.balance > 0 ? (
                    <Link
                      href="/profile/wallet"
                      aria-label={`Wallet · ${formatMoneyCompact(wallet.balance, walletCurrency)}`}
                      title="GETX Coins"
                      className="
                        inline-flex items-center gap-1.5 h-10 px-3 rounded-full
                        bg-[hsl(var(--success)/0.08)] ring-1 ring-[hsl(var(--success)/0.18)]
                        text-[hsl(var(--success))] text-[12.5px] font-semibold tabular-nums
                        hover:bg-[hsl(var(--success)/0.14)] hover:ring-[hsl(var(--success)/0.30)]
                        transition-all duration-150
                      "
                    >
                      <Wallet className="h-3.5 w-3.5" strokeWidth={2.25} />
                      {formatMoneyCompact(wallet.balance, walletCurrency)}
                    </Link>
                  ) : null}
                  {loyalty && loyalty.balance > 0 ? (
                    <Link
                      href="/profile/loyalty"
                      aria-label={`Loyalty · ${loyalty.balance.toLocaleString('en-US')} points`}
                      title={`Loyalty points · ${loyalty.balance.toLocaleString('en-US')} pts`}
                      className="
                        inline-flex items-center gap-1.5 h-10 px-3 rounded-full
                        bg-[hsl(280_85%_60%/0.08)] ring-1 ring-[hsl(280_85%_60%/0.18)]
                        text-[hsl(280_85%_60%)] text-[12.5px] font-semibold tabular-nums
                        hover:bg-[hsl(280_85%_60%/0.14)] hover:ring-[hsl(280_85%_60%/0.30)]
                        transition-all duration-150
                      "
                    >
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {loyalty.balance >= 1000
                        ? `${(loyalty.balance / 1000).toFixed(1)}k`
                        : loyalty.balance.toLocaleString('en-US')}
                    </Link>
                  ) : null}
                  <NotificationBell />
                  <Link
                    href="/messages"
                    aria-label={`Messages${unread > 0 ? ` (${unread} unread)` : ''}`}
                    className="
                      relative h-10 w-10 grid place-items-center rounded-full
                      text-[hsl(var(--foreground)/0.75)]
                      hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-elevated))]
                      transition-all duration-150
                    "
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={2} />
                    {unread > 0 ? (
                      <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[hsl(var(--error))] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[hsl(var(--background))]">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null}
                  </Link>

                  {/* Avatar + menu dropdown — clean ring treatment, no
                      heavy background unless hovered. */}
                  <div className="relative ml-1">
                    <button
                      type="button"
                      onClick={() => setAcctOpen((s) => !s)}
                      aria-haspopup="menu"
                      aria-expanded={acctOpen}
                      className="
                        inline-flex items-center gap-2 h-10 pl-1 pr-2.5 rounded-full
                        ring-1 ring-[hsl(var(--border))]
                        hover:ring-[hsl(var(--foreground)/0.18)] hover:bg-[hsl(var(--surface-elevated))]
                        transition-all duration-150
                      "
                    >
                      <span
                        className="h-8 w-8 rounded-full grid place-items-center text-white font-bold text-[12px] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18),0_2px_6px_-2px_hsl(var(--primary)/0.45)]"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
                        }}
                      >
                        {(user?.name?.[0] ?? user?.email?.[0] ?? 'G').toUpperCase()}
                      </span>
                      <span className="hidden lg:inline text-[12.5px] font-medium text-[hsl(var(--foreground))]">
                        {user?.name?.split(' ')[0] ?? 'Account'}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-[hsl(var(--muted-foreground))] transition-transform ${acctOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {acctOpen ? (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_24px_60px_-24px_hsl(0_0%_0%/0.25)] overflow-hidden z-30"
                      >
                        <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                          <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] truncate">
                            {user?.name ?? 'Account'}
                          </div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                            {user?.email}
                          </div>
                        </div>
                        <ul className="py-1">
                          <AccountMenuItem
                            href="/profile"
                            icon={User}
                            label="Profile"
                          />
                          <AccountMenuItem
                            href="/profile/orders"
                            icon={ShoppingBag}
                            label="Orders"
                          />
                          <AccountMenuItem
                            href="/profile/saved-searches"
                            icon={Bell}
                            label="Saved searches"
                          />
                          <AccountMenuItem
                            href="/profile/wallet"
                            icon={Wallet}
                            label="Wallet"
                          />
                          <AccountMenuItem
                            href="/profile/settings"
                            icon={Settings}
                            label="Settings"
                          />
                        </ul>
                        <div className="border-t border-[hsl(var(--border))] py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAcctOpen(false);
                              void logout();
                            }}
                            className="w-full inline-flex items-center gap-2 px-4 py-2.5 text-[13px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-elevated))] hover:text-[hsl(var(--foreground))] transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href="/auth/login"
                    className="
                      inline-flex h-10 px-3.5 items-center rounded-full whitespace-nowrap shrink-0
                      text-[13px] font-medium text-[hsl(var(--foreground)/0.85)]
                      hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-elevated))]
                      transition-all duration-150
                    "
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="
                      group inline-flex items-center gap-1.5 h-10 px-4 lg:px-5 rounded-full whitespace-nowrap shrink-0
                      bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))]
                      text-white text-[13px] font-semibold tracking-tight
                      shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.22),inset_0_-2px_0_hsl(0_0%_0%/0.15)]
                      hover:-translate-y-px hover:from-[hsl(var(--primary-hover))] hover:to-[hsl(var(--primary))]
                      active:translate-y-0 active:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.40),inset_0_1px_0_hsl(0_0%_100%/0.10)]
                      transition-all duration-150
                    "
                  >
                    <Sparkles className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
                    Get started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((m) => !m)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="md:hidden h-11 w-11 grid place-items-center rounded-full bg-[hsl(var(--surface-elevated))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* TIER 3 — category nav strip (edge-to-edge, refined) */}
        <div
          className="
            hidden md:block border-t border-[hsl(var(--border))]
            bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--surface)/0.4)]
          "
        >
          <div className="mx-auto max-w-[1400px] px-0">
            <CategoryStrip
              categories={CATEGORIES}
              secondary={SECONDARY}
              isActive={isActive}
            />
          </div>
        </div>

      </header>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE FULL-SCREEN DRAWER — overlays the entire viewport when
          hamburger is open. Slides in from the right with backdrop
          blur. Body scroll locked while open.
          ════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 z-[60]"
          >
            {/* Backdrop — tap to close */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer panel — slides up to fill the screen */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="
                absolute inset-0 flex flex-col
                bg-background
              "
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              {/* Atmospheric backdrop layers inside the drawer */}
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,hsl(var(--primary)/0.18),transparent_65%)]" />
                <div
                  className="absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage:
                      'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
                    backgroundSize: '26px 26px',
                  }}
                />
              </div>

              {/* TOP BAR — logo + close button */}
              <div className="relative shrink-0 border-b border-border/40">
                <div className="flex items-center justify-between px-5 py-4">
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    aria-label="GETX home"
                  >
                    <Image
                      src="/logos/getx-logo-dark.svg"
                      alt="GETX"
                      width={384}
                      height={256}
                      sizes="120px"
                      className="h-7 w-auto dark:hidden"
                    />
                    <Image
                      src="/brand/getx-logo.webp"
                      alt="GETX"
                      width={1920}
                      height={640}
                      sizes="120px"
                      className="h-8 w-auto hidden dark:block"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    className="
                      h-10 w-10 grid place-items-center rounded-full
                      bg-surface ring-1 ring-border
                      text-foreground hover:bg-surface-elevated
                      transition-colors
                    "
                  >
                    <X className="h-5 w-5" strokeWidth={2.25} />
                  </button>
                </div>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="relative flex-1 overflow-y-auto">
                <div className="px-5 py-6 space-y-6">
                  {/* Mobile search */}
                  <form
                    onSubmit={submitSearch}
                    className="
                      flex items-center gap-2 h-12 rounded-2xl
                      bg-surface ring-1 ring-border
                      focus-within:ring-2 focus-within:ring-primary
                      px-4 transition-all
                    "
                  >
                    <Search className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      type="text"
                      placeholder="Hundo Mewtwo, Lv 50 Mystic…"
                      aria-label="Search"
                      className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground/70 min-w-0"
                    />
                  </form>

                  {/* Marketplace categories — bigger touch targets, icons left */}
                  <div>
                    <div className="text-[10.5px] font-mono font-bold uppercase tracking-[0.22em] text-foreground/75 mb-3 px-1">
                      ── Marketplace
                    </div>
                    <ul className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((c) => (
                        <li key={c.label}>
                          <Link
                            href={c.href}
                            onClick={() => setMenuOpen(false)}
                            className="
                              group flex flex-col items-start gap-2
                              h-full p-3.5 rounded-2xl
                              bg-surface ring-1 ring-border
                              hover:ring-primary/40 hover:bg-primary/[0.04]
                              transition-all
                            "
                          >
                            <span
                              className="
                                h-9 w-9 rounded-xl grid place-items-center
                                bg-primary/10 text-primary
                                group-hover:bg-primary group-hover:text-primary-foreground
                                transition-colors
                              "
                            >
                              <c.icon className="h-4 w-4" strokeWidth={2.25} />
                            </span>
                            <span className="text-[13.5px] font-semibold text-foreground leading-tight">
                              {c.label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Company links */}
                  <div>
                    <div className="text-[10.5px] font-mono font-bold uppercase tracking-[0.22em] text-foreground/75 mb-3 px-1">
                      ── Company
                    </div>
                    <ul className="space-y-1">
                      {SECONDARY.map((s) => (
                        <li key={s.href}>
                          <Link
                            href={s.href}
                            onClick={() => setMenuOpen(false)}
                            className="
                              flex items-center justify-between
                              px-4 py-3.5 rounded-xl
                              text-[14.5px] font-medium text-foreground/85
                              hover:bg-foreground/[0.04] hover:text-foreground
                              transition-colors
                            "
                          >
                            {s.label}
                            <ChevronRight className="h-4 w-4 text-foreground/45" />
                          </Link>
                        </li>
                      ))}
                      <li>
                        <a
                          href={sellerUrl}
                          className="
                            flex items-center justify-between
                            px-4 py-3.5 rounded-xl
                            text-[14.5px] font-bold text-primary
                            bg-primary/8 hover:bg-primary/15
                            transition-colors
                          "
                        >
                          <span className="inline-flex items-center gap-2">
                            <Zap className="h-4 w-4 fill-current" strokeWidth={2.5} />
                            Sell on GetX
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Theme toggle — mobile users need this too. Lives in
                      Tier 3 on desktop (hidden on mobile), so we surface
                      it here in the drawer. */}
                  <div>
                    <div className="text-[10.5px] font-mono font-bold uppercase tracking-[0.22em] text-foreground/75 mb-3 px-1">
                      ── Preferences
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface ring-1 ring-border">
                      <span className="text-[14px] font-medium text-foreground">
                        Theme
                      </span>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </div>

              {/* STICKY FOOTER — account or auth CTAs */}
              <div className="relative shrink-0 border-t border-border/40 bg-background px-5 py-4">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="
                        flex items-center gap-3 p-3 rounded-2xl
                        bg-surface ring-1 ring-border
                      "
                    >
                      <span
                        className="h-11 w-11 rounded-full grid place-items-center text-white font-bold text-[15px]"
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
                        }}
                      >
                        {(user?.name?.[0] ?? 'G').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-foreground truncate">
                          {user?.name ?? 'Account'}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate">
                          {user?.email}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-foreground/45" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                      className="w-full h-11 rounded-full ring-1 ring-border text-foreground/75 text-[13px] font-semibold hover:bg-foreground/[0.04]"
                    >
                      Sign out
                    </button>
                  </div>
                ) : !loading ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/auth/login"
                      className="block"
                      onClick={() => setMenuOpen(false)}
                    >
                      <button className="w-full h-12 rounded-full ring-1 ring-border text-foreground text-[14px] font-semibold hover:bg-foreground/[0.04] transition-colors">
                        Sign in
                      </button>
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block"
                      onClick={() => setMenuOpen(false)}
                    >
                      <button
                        className="
                          w-full h-12 rounded-full
                          bg-gradient-to-b from-primary to-primary-hover
                          text-primary-foreground text-[14px] font-bold
                          shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.5)]
                          hover:-translate-y-px transition-all
                        "
                      >
                        Get started
                      </button>
                    </Link>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}

function AccountMenuItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[hsl(var(--foreground)/0.85)] hover:bg-[hsl(var(--surface-elevated))] hover:text-[hsl(var(--foreground))] transition-colors"
      >
        <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        {label}
      </Link>
    </li>
  );
}

/* --------------------------- SearchAutocomplete --------------------------- */

function SearchAutocomplete({
  results,
  query,
  activeId,
  loading,
  onSelectTrending,
  onClose,
}: {
  results: SearchResults;
  query: string;
  activeId?: string;
  loading?: boolean;
  onSelectTrending: (t: string) => void;
  onClose: () => void;
}) {
  const q = query.trim();
  const empty = q.length === 0;
  const tooShort = !empty && q.length < 2;
  const { games, listings, sellers } = results;
  const hasAnyResults =
    games.length + listings.length + sellers.length > 0;

  const optionClass = (id: string) =>
    `flex items-center gap-3 px-4 py-2.5 transition-colors ${
      activeId === id
        ? 'bg-[hsl(var(--surface-elevated))] ring-1 ring-inset ring-[hsl(var(--primary)/0.4)]'
        : 'hover:bg-[hsl(var(--surface-elevated))]'
    }`;

  return (
    <div
      id="header-search-autocomplete"
      role="listbox"
      aria-label="Search suggestions"
      className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_24px_60px_-20px_hsl(0_0%_0%/0.25)] overflow-hidden z-30 max-h-[min(80vh,560px)] overflow-y-auto"
    >
      {empty ? (
        <div className="p-3">
          <div className="px-2 pt-1 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Trending searches
          </div>
          <ul className="flex flex-wrap gap-1.5 px-1 pb-2">
            {TRENDING_SEARCHES.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => onSelectTrending(t)}
                  className="inline-flex items-center h-8 px-3 rounded-full bg-[hsl(var(--surface-elevated))] text-[12.5px] text-[hsl(var(--foreground)/0.85)] hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : tooShort ? (
        <div className="p-6 text-center text-[13px] text-[hsl(var(--muted-foreground))]">
          Type at least 2 characters to search.
        </div>
      ) : loading && !hasAnyResults ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-2 py-2"
            >
              <div className="h-8 w-8 rounded-lg bg-[hsl(var(--surface-elevated))] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/5 rounded bg-[hsl(var(--surface-elevated))] animate-pulse" />
                <div className="h-2.5 w-2/5 rounded bg-[hsl(var(--surface-elevated))] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasAnyResults ? (
        <div className="p-6 text-center text-[13px] text-[hsl(var(--muted-foreground))]">
          No matches for <span className="font-semibold text-[hsl(var(--foreground))]">&ldquo;{q}&rdquo;</span>.
          <div className="mt-1 text-[11px]">Try a game name, level, or seller handle.</div>
        </div>
      ) : (
        <div className="py-2">
          {games.length > 0 ? (
            <ResultGroup label="Games">
              {games.map((g, i) => {
                const id = `hdr-srch-game-${i}`;
                return (
                <Link
                  key={g.href}
                  id={id}
                  href={g.href}
                  role="option"
                  aria-selected={activeId === id}
                  onClick={onClose}
                  className={optionClass(id)}
                >
                  <span
                    className={`h-8 w-8 rounded-lg grid place-items-center text-[11px] font-bold ${
                      g.status === 'live'
                        ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                        : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                    }`}
                  >
                    {g.status === 'live' ? '●' : '✦'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[hsl(var(--foreground))] truncate">
                      {g.title}
                    </div>
                    <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] truncate">
                      {g.detail}
                    </div>
                  </div>
                  {g.status === 'live' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] text-[10px] font-bold uppercase tracking-wider">
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[hsl(var(--muted-foreground)/0.15)] text-[hsl(var(--muted-foreground))] text-[10px] font-bold uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                </Link>
                );
              })}
            </ResultGroup>
          ) : null}

          {listings.length > 0 ? (
            <ResultGroup label="Listings">
              {listings.map((l, i) => {
                const id = `hdr-srch-list-${i}`;
                return (
                <Link
                  key={l.href}
                  id={id}
                  href={l.href}
                  role="option"
                  aria-selected={activeId === id}
                  onClick={onClose}
                  className={optionClass(id)}
                >
                  <span className="h-8 w-8 rounded-lg grid place-items-center bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[hsl(var(--foreground))] truncate">
                      {l.title}
                    </div>
                    <div className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                      {l.category}
                    </div>
                  </div>
                  <span className="font-display font-extrabold tabular-nums text-[13.5px] text-[hsl(var(--foreground))] shrink-0">
                    {formatMoney(l.price, 'USD')}
                  </span>
                </Link>
                );
              })}
            </ResultGroup>
          ) : null}

          {sellers.length > 0 ? (
            <ResultGroup label="Sellers">
              {sellers.map((s, i) => {
                const id = `hdr-srch-sell-${i}`;
                return (
                <Link
                  key={s.href}
                  id={id}
                  href={s.href}
                  role="option"
                  aria-selected={activeId === id}
                  onClick={onClose}
                  className={optionClass(id)}
                >
                  <span
                    className="h-8 w-8 rounded-full grid place-items-center text-white text-[11px] font-bold"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
                    }}
                  >
                    {s.handle.replace('@', '').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[hsl(var(--foreground))] truncate">
                      {s.handle}
                    </div>
                    <div className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                      ★ {s.rating} · {s.orders} orders
                    </div>
                  </div>
                </Link>
                );
              })}
            </ResultGroup>
          ) : null}
        </div>
      )}

      {/* Footer hint */}
      <div className="px-4 py-2 text-[11px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">↑</kbd>
          <kbd className="font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">↓</kbd>
          to navigate · <kbd className="font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">Enter</kbd> to select
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">Esc</kbd>
          to close
        </span>
      </div>
    </div>
  );
}

function ResultGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1.5" role="group" aria-label={label}>
      <div className="px-4 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* --------------------------- CategoryStrip --------------------------- */

interface CategoryStripProps {
  categories: typeof CATEGORIES;
  secondary: typeof SECONDARY;
  isActive: (href: string) => boolean;
}

function CategoryStrip({
  categories,
  secondary,
  isActive,
}: CategoryStripProps) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const computeScrollState = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const epsilon = 4;
    setCanScrollLeft(el.scrollLeft > epsilon);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - epsilon);
  }, []);

  React.useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    computeScrollState();
    el.addEventListener('scroll', computeScrollState, { passive: true });
    const ro = new ResizeObserver(computeScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', computeScrollState);
      ro.disconnect();
    };
  }, [computeScrollState]);

  const nudge = (dir: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Scrollable rail — no internal padding, so the first tab sits
          flush with the wrapper's left edge. */}
      <div
        ref={railRef}
        className="overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        <ul className="flex items-center justify-between gap-4 min-w-max md:min-w-0">
          <li className="flex items-center py-1.5 shrink-0 -ml-1.5">
            <IconTabs
              size="sm"
              tabs={categories.map((c) => ({
                id: c.id,
                label: c.label,
                icon: c.icon,
                href: c.href,
                isNew: c.isNew,
              }))}
              activeId={
                categories.find((c) => isActive(c.href))?.id ?? ''
              }
              renderTab={(tab, props, content) => {
                const href = categories.find((c) => c.id === tab.id)?.href ?? '/';
                return (
                  <Link href={href} prefetch {...props}>
                    {content}
                  </Link>
                );
              }}
            />
          </li>
          <li className="hidden lg:flex items-center gap-0.5 py-1 shrink-0">
            {secondary.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="
                  inline-flex items-center h-7 px-2.5 rounded-full
                  text-[11.5px] font-medium text-[hsl(var(--foreground)/0.75)]
                  hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-elevated))]
                  transition-all duration-150 whitespace-nowrap
                "
              >
                {s.label}
              </Link>
            ))}

            {/* Divider before the theme toggle so it reads as its own
                control rather than another nav link. */}
            <span
              aria-hidden
              className="mx-1.5 h-4 w-px bg-gradient-to-b from-transparent via-[hsl(var(--border))] to-transparent"
            />

            <ThemeToggle />
          </li>
        </ul>
      </div>
    </div>
  );
}
