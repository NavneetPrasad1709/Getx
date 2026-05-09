'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useListings, type ListingFilters, type SortOption } from '@/hooks/use-listings';
import { ListingCard } from '@/components/listings/listing-card';
import { AccountsFilters } from '@/components/listings/accounts-filters';
import { Pagination } from '@/components/listings/pagination';
import { SortDropdown } from '@/components/listings/sort-dropdown';

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
    if (!('page' in updates)) {
      params.delete('page');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clearFilters = () => router.push(pathname);

  const limit = filters.limit ?? 24;
  const page = filters.page ?? 1;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="border-b bg-muted/20">
        <div className="container py-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-muted-foreground mb-3"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/games" className="hover:text-foreground">
              Games
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/games/pokemon-go" className="hover:text-foreground">
              Pokemon GO
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Accounts</span>
          </nav>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Pokemon GO Accounts</h1>
          <p className="text-muted-foreground">
            Verified trainer accounts with shinies, legendaries, and progress.
          </p>
        </div>
      </section>

      <main className="flex-1 container py-8">
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowMobileFilters((s) => !s)}
            className="w-full"
          >
            {showMobileFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          <aside className={`${showMobileFilters ? 'block' : 'hidden'} md:block`}>
            <AccountsFilters filters={filters} onUpdate={updateFilters} onClear={clearFilters} />
          </aside>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading...'
                  : data
                    ? `Showing ${
                        data.pagination.total === 0 ? 0 : (page - 1) * limit + 1
                      }-${Math.min(page * limit, data.pagination.total)} of ${
                        data.pagination.total
                      } accounts`
                    : null}
              </p>
              <SortDropdown
                value={filters.sort ?? 'newest'}
                onChange={(sort) => updateFilters({ sort })}
              />
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[340px] w-full" />
                ))}
              </div>
            )}

            {error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h2 className="font-semibold text-lg mb-1">Failed to load listings</h2>
                  <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
                </CardContent>
              </Card>
            )}

            {data && data.data.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h2 className="font-semibold text-lg mb-1">No accounts match your filters</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your filters or post a custom request.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button onClick={clearFilters}>Clear filters</Button>
                    <Link href="/requests/new">
                      <Button variant="outline">Post Custom Request</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {data && data.data.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.data.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {data.pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={(p) => updateFilters({ page: p })}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export default function AccountsBrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AccountsBrowseContent />
    </Suspense>
  );
}
