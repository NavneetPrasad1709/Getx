'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  Star,
  BadgeCheck,
  Gamepad2,
  ArrowRight,
  ScrollText,
  Clock,
} from 'lucide-react';
import { Input, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ListingCard, ListingCardSkeleton } from '@/components/listings/listing-card';
import {
  useSearchListings,
  useSearchSellers,
  useSearchGames,
  useSearchRequests,
  type SearchSeller,
  type SearchGame,
  type SearchRequest,
} from '@/hooks/use-search';
import { formatMoney } from '@/lib/currency';

/* Federated cross-category search page.

   Behaviour:
   - Reads ?q= from URL on mount + listens for changes
   - Three parallel queries (listings + sellers + games) — each renders
     its own section with a skeleton fallback
   - Min query length 2 chars (matches the backend gate)
   - Empty / no-results states surface a "Try a different query" hint
   - Header search submit posts here via window.location (wired in
     header.tsx → submitSearch helper) */

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-6xl pt-24 pb-20">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchContent />
        </Suspense>
      </main>
      <LandingFooter />
    </div>
  );
}

function SearchContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const initialQ = sp.get('q') ?? '';
  const [query, setQuery] = React.useState(initialQ);
  /* Debounce typing so we don't hammer the API on every keypress. */
  const [debouncedQ, setDebouncedQ] = React.useState(initialQ);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  /* Keep the URL in sync so reloads + share-links work. Replace, not
     push, so back-button doesn't pile up keystrokes. */
  React.useEffect(() => {
    if (!debouncedQ) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('q') !== debouncedQ) {
      url.searchParams.set('q', debouncedQ);
      router.replace(`/search?${url.searchParams.toString()}`, { scroll: false });
    }
  }, [debouncedQ, router]);

  const tooShort = debouncedQ.length < 2;
  const listings = useSearchListings(debouncedQ, !tooShort);
  const sellers = useSearchSellers(debouncedQ, !tooShort);
  const games = useSearchGames(debouncedQ, !tooShort);
  const requests = useSearchRequests(debouncedQ, !tooShort);

  const anyResults =
    (listings.data?.data.length ?? 0) > 0 ||
    (sellers.data?.length ?? 0) > 0 ||
    (games.data?.length ?? 0) > 0 ||
    (requests.data?.data.length ?? 0) > 0;
  const loading =
    listings.isLoading ||
    sellers.isLoading ||
    games.isLoading ||
    requests.isLoading;

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span aria-hidden className="mx-2">·</span>
        <span className="text-foreground">Search</span>
      </nav>

      <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
        Search GETX
      </h1>

      {/* Inline search input — works as standalone deep-link too. */}
      <div className="relative max-w-2xl mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Listings · sellers · games"
          autoFocus
          className="h-12 pl-11 text-[14px] rounded-full"
        />
      </div>

      {tooShort ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-surface/30 p-10 text-center">
          <SearchIcon className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
          <p className="text-[14px] text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        </div>
      ) : loading && !anyResults ? (
        <SearchSkeleton />
      ) : !anyResults ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-surface/30 p-10 text-center">
          <p className="text-[14px] text-muted-foreground">
            No matches for{' '}
            <span className="font-semibold text-foreground">&ldquo;{debouncedQ}&rdquo;</span>.
            Try a game name, seller handle, or listing title.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {games.data && games.data.length > 0 ? (
            <Section title="Games" count={games.data.length}>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {games.data.map((g) => (
                  <GameTile key={g.id} game={g} />
                ))}
              </ul>
            </Section>
          ) : null}

          {sellers.data && sellers.data.length > 0 ? (
            <Section
              title="Sellers"
              count={sellers.data.length}
              viewAllHref={null}
            >
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sellers.data.map((s) => (
                  <SellerTile key={s.id} seller={s} />
                ))}
              </ul>
            </Section>
          ) : null}

          {listings.data && listings.data.data.length > 0 ? (
            <Section
              title="Listings"
              count={listings.data.total}
              viewAllHref={`/games/pokemon-go/accounts?q=${encodeURIComponent(debouncedQ)}`}
              viewAllLabel="Browse all matches"
            >
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.data.data.slice(0, 12).map((l) => (
                  <li key={l.id}>
                    <ListingCard listing={l} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {requests.data && requests.data.data.length > 0 ? (
            <Section
              title="Custom requests"
              count={requests.data.total}
              viewAllHref={`/requests?q=${encodeURIComponent(debouncedQ)}`}
              viewAllLabel="See all open requests"
            >
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requests.data.data.slice(0, 10).map((r) => (
                  <RequestTile key={r.id} request={r} />
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      )}
    </>
  );
}

function Section({
  title,
  count,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string;
  count: number;
  viewAllHref?: string | null;
  viewAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl md:text-2xl font-extrabold tracking-tight inline-flex items-baseline gap-2">
          {title}
          <span className="font-mono text-[12px] font-semibold text-muted-foreground tabular-nums">
            {count}
          </span>
        </h2>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-[12.5px] font-semibold text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1"
          >
            {viewAllLabel ?? 'View all'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function GameTile({ game }: { game: SearchGame }) {
  return (
    <li>
      <Link
        href={`/games/${game.slug}`}
        className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
      >
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--primary)/0.1)] grid place-items-center text-[hsl(var(--primary))] shrink-0">
          <Gamepad2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-extrabold truncate">
            {game.name}
          </div>
          <div className="text-[11.5px] text-muted-foreground truncate">
            {game.totalListings.toLocaleString()} listings · {game.totalSellers.toLocaleString()} sellers
          </div>
        </div>
        {game.isLaunched ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] text-[10px] font-bold uppercase tracking-wider shrink-0">
            Live
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted-foreground)/0.15)] text-muted-foreground text-[10px] font-bold uppercase tracking-wider shrink-0">
            Soon
          </span>
        )}
      </Link>
    </li>
  );
}

function SellerTile({ seller }: { seller: SearchSeller }) {
  const handle = seller.username ?? seller.name ?? '—';
  const display = seller.displayName ?? seller.name ?? handle;
  return (
    <li>
      <Link
        href={`/users/${handle}`}
        className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
      >
        <div className="relative shrink-0">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 grid place-items-center text-white text-[14px] font-bold">
            {display.charAt(0).toUpperCase()}
          </div>
          {seller.isOnline ? (
            <span
              aria-label="Online now"
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[hsl(var(--success))] ring-2 ring-[hsl(var(--background))]"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13.5px] font-extrabold truncate inline-flex items-center gap-1">
            {display}
            {seller.isVerified ? (
              <BadgeCheck className="h-3.5 w-3.5 text-[hsl(var(--primary))] shrink-0" />
            ) : null}
          </div>
          <div className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1.5">
            <Star className="h-3 w-3 fill-[#FFCB05] text-[#FFCB05]" />
            <span className="tabular-nums">{seller.sellerRating.toFixed(2)}</span>
            <span aria-hidden>·</span>
            <span>{seller.totalSales} sales</span>
          </div>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-[hsl(var(--primary))] shrink-0">
          {seller.rank}
        </span>
      </Link>
    </li>
  );
}

function RequestTile({ request }: { request: SearchRequest }) {
  const budget =
    request.budgetMin !== null && request.budgetMax !== null
      ? `${formatMoney(request.budgetMin, request.currency)} – ${formatMoney(request.budgetMax, request.currency)}`
      : '—';
  const expiresInH = Math.max(
    0,
    Math.floor(
      (new Date(request.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000),
    ),
  );
  return (
    <li>
      <Link
        href={`/requests/${request.id}`}
        className="group flex flex-col gap-2 rounded-2xl border border-border/60 bg-surface p-4 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1">
              <ScrollText className="h-3 w-3" />
              {request.game.name} · {request.tabType.replace('_', '-').toLowerCase()}
            </div>
            <div className="font-display text-[14.5px] font-extrabold truncate group-hover:text-[hsl(var(--primary))] transition-colors">
              {request.title}
            </div>
          </div>
          <span className="font-display text-[15px] font-extrabold tabular-nums text-[hsl(var(--primary))] shrink-0">
            {budget}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground line-clamp-2">
          {request.description}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Expires in {expiresInH}h
          </span>
          <span className="tabular-nums">
            {request.offerCount} offer{request.offerCount === 1 ? '' : 's'}
          </span>
        </div>
      </Link>
    </li>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-12">
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
