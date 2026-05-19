'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useListings, type ListingFilters, type SortOption } from '@/hooks/use-listings';
import { ListingCard, ListingCardSkeleton } from '@/components/listings/listing-card';
import { AccountsFilters } from '@/components/listings/accounts-filters';
import { Pagination } from '@/components/listings/pagination';
import {
  BrowseHeader,
  PillFilterBar,
  EmptyState,
  type ActiveChip,
} from '@/components/listings/browse-shell';
import { BrowseTrustStrip } from '@/components/listings/browse-trust-strip';
import { FeaturedTrophyRow } from '@/components/listings/featured-trophy-row';
import { CustomRequestButton } from '@/components/custom-request/custom-request-button';
import { SaveSearchButton } from '@/components/listings/save-search-button';
import { CustomRequestCTA } from '@/components/custom-request/custom-request-cta';
import { FloatingCTA } from '@/components/custom-request/floating-cta';

function intParam(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function floatParam(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function AccountsBrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  /* A11y for the mobile filter sheet:
     - Escape key closes the drawer
     - Body scroll locks while open (keeps the backdrop in place)
     Click-outside dismissal is already handled by the backdrop button. */
  useEffect(() => {
    if (!showMobileFilters) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobileFilters(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [showMobileFilters]);

  const filters: ListingFilters = {
    gameSlug: 'pokemon-go',
    tabType: 'ACCOUNTS',
    page: intParam(searchParams.get('page')) ?? 1,
    sort: (searchParams.get('sort') as SortOption | null) ?? 'newest',
    priceMin: floatParam(searchParams.get('priceMin')),
    priceMax: floatParam(searchParams.get('priceMax')),
    levelMin: intParam(searchParams.get('levelMin')),
    levelMax: intParam(searchParams.get('levelMax')),
    team: searchParams.get('team') ?? undefined,
    shinyMin: intParam(searchParams.get('shinyMin')),
    legendaryMin: intParam(searchParams.get('legendaryMin')),
    hundoMin: intParam(searchParams.get('hundoMin')),
    region: searchParams.get('region') ?? undefined,
    platform: searchParams.get('platform') ?? undefined,
  };

  const { data, isLoading, error } = useListings(filters);

  const updateFilters = (updates: Partial<ListingFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '' || v === null) {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    }
    if (!('page' in updates)) params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clearFilters = () => router.push(pathname);

  const limit = filters.limit ?? 24;
  const page = filters.page ?? 1;

  const chips: ActiveChip[] = [];
  if (filters.priceMin || filters.priceMax) {
    const label = `$${filters.priceMin ?? 0} – ${filters.priceMax ? `$${filters.priceMax}` : '∞'}`;
    chips.push({ key: 'price', label, onRemove: () => updateFilters({ priceMin: undefined, priceMax: undefined }) });
  }
  if (filters.levelMin || filters.levelMax) {
    chips.push({
      key: 'level',
      label: `Lv ${filters.levelMin ?? 1}–${filters.levelMax ?? 80}`,
      onRemove: () => updateFilters({ levelMin: undefined, levelMax: undefined }),
    });
  }
  if (filters.team) {
    chips.push({ key: 'team', label: filters.team, onRemove: () => updateFilters({ team: undefined }) });
  }
  if (filters.shinyMin) {
    chips.push({ key: 'shinyMin', label: `★ ${filters.shinyMin}+`, onRemove: () => updateFilters({ shinyMin: undefined }) });
  }
  if (filters.legendaryMin) {
    chips.push({ key: 'legendaryMin', label: `Leg ${filters.legendaryMin}+`, onRemove: () => updateFilters({ legendaryMin: undefined }) });
  }
  if (filters.hundoMin) {
    chips.push({ key: 'hundoMin', label: `100% × ${filters.hundoMin}+`, onRemove: () => updateFilters({ hundoMin: undefined }) });
  }
  if (filters.region) {
    chips.push({ key: 'region', label: filters.region, onRemove: () => updateFilters({ region: undefined }) });
  }
  if (filters.platform) {
    chips.push({ key: 'platform', label: filters.platform, onRemove: () => updateFilters({ platform: undefined }) });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <BrowseHeader
        eyebrow="Pokémon GO · Accounts"
        title="Trainer accounts"
        subtitle="Pre-leveled accounts with shinies, legendaries, master trainer medals, regional dex. All escrow-protected."
        trail={[
          { href: '/', label: 'Home' },
          { href: '/games', label: 'Games' },
          { href: '/games/pokemon-go', label: 'Pokémon GO' },
          { label: 'Accounts' },
        ]}
      />

      <PillFilterBar
        total={data?.pagination.total ?? null}
        isLoading={isLoading}
        activeChips={chips}
        sort={filters.sort ?? 'newest'}
        onSortChange={(sort) => updateFilters({ sort })}
        onClearAll={clearFilters}
        onOpenFilters={() => setShowMobileFilters((s) => !s)}
        saveSearchSlot={<SaveSearchButton gameSlug="pokemon-go" tabType="ACCOUNTS" />}
      />

      <main id="main" className="flex-1 container pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          {/* DESKTOP sidebar — sticky column */}
          <aside className="hidden md:block md:sticky md:top-44 md:self-start md:max-h-[calc(100vh-200px)] md:overflow-y-auto">
            <AccountsFilters filters={filters} onUpdate={updateFilters} onClear={clearFilters} />
          </aside>

          {/* MOBILE bottom-sheet — slides up, backdrop dismiss, locks
              scroll. Renders only when the toggle is on so it doesn't
              intercept taps when closed. */}
          {showMobileFilters ? (
            <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setShowMobileFilters(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl bg-background ring-1 ring-border shadow-[0_-12px_40px_-12px_rgb(0_0_0_/_0.4)] flex flex-col">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60 shrink-0">
                  <div>
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary font-bold">
                      Refine
                    </div>
                    <div className="font-display font-bold text-foreground text-[16px]">
                      Filters
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    aria-label="Close"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.10] text-foreground transition-colors text-[18px] font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <AccountsFilters filters={filters} onUpdate={updateFilters} onClear={clearFilters} />
                </div>
                <div className="shrink-0 px-5 py-4 border-t border-border/60 flex items-center gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={clearFilters}>
                    Clear all
                  </Button>
                  <Button className="flex-1 h-11" onClick={() => setShowMobileFilters(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <BrowseTrustStrip />

            {/* Show the trophy row only when the user hasn't narrowed the catalog —
                a featured drop should be the welcome mat, not a hijack of a
                filtered search. */}
            {chips.length === 0 ? (
              <FeaturedTrophyRow
                gameSlug="pokemon-go"
                tabType="ACCOUNTS"
                hrefBase="/games/pokemon-go/accounts"
              />
            ) : null}

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            )}

            {error && (
              <EmptyState
                title="Couldn't load accounts"
                body="Network hiccup. Refresh, or come back in a minute."
                actions={
                  <Button onClick={() => location.reload()}>Refresh</Button>
                }
              />
            )}

            {data && data.data.length === 0 && (
              <EmptyState
                title="Nothing matches those filters"
                body="Try widening the range, or post a custom request — sellers will come to you."
                actions={
                  <>
                    <Button onClick={clearFilters}>Clear filters</Button>
                    <CustomRequestButton gameSlug="pokemon-go" tabType="ACCOUNTS" variant="outline" />
                  </>
                }
              />
            )}

            {data && data.data.length > 0 && (
              <>
                <div className="mb-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
                  Showing {data.pagination.total === 0 ? 0 : (page - 1) * limit + 1}
                  &ndash;{Math.min(page * limit, data.pagination.total)} of {data.pagination.total}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                  {data.data.map((listing, i) => (
                    <ListingCard key={listing.id} listing={listing} priority={i < 6} />
                  ))}
                </div>

                {data.pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={(p) => updateFilters({ page: p })}
                  />
                )}

                <div className="mt-12">
                  <CustomRequestCTA gameSlug="pokemon-go" tabType="ACCOUNTS" variant="banner" />
                </div>
              </>
            )}
          </div>
        </div>

        <FloatingCTA gameSlug="pokemon-go" tabType="ACCOUNTS" />
      </main>

      <LandingFooter />
    </div>
  );
}

export default function AccountsBrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AccountsBrowseContent />
    </Suspense>
  );
}
