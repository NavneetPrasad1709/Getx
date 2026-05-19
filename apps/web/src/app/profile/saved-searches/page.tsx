'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, BellOff, Trash2, ChevronRight, Plus } from 'lucide-react';
import { Button, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';
import {
  useDeleteSavedSearch,
  useMySavedSearches,
  useUpdateSavedSearch,
  type SavedSearch,
} from '@/hooks/use-saved-searches';

/* Saved searches dashboard — list view at /profile/saved-searches.
   Auth-gated; redirects unauthenticated visitors back to /auth/login. */

function viewAllUrlFor(row: SavedSearch): string {
  const f = row.filters ?? {};
  const game = String(f.gameSlug ?? row.gameSlug ?? 'pokemon-go');
  const tab = String(f.tabType ?? row.tabType ?? 'ACCOUNTS');
  const seg = tab === 'TOP_UPS' ? 'top-ups' : tab === 'ITEMS' ? 'items' : 'accounts';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'gameSlug' || k === 'tabType') continue;
    qs.set(k, String(v));
  }
  const tail = qs.toString();
  return `/games/${game}/${seg}${tail ? `?${tail}` : ''}`;
}

function filterChips(row: SavedSearch): string[] {
  const f = row.filters ?? {};
  const out: string[] = [];
  const push = (label: string) => out.push(label);

  if (f.levelMin !== undefined && f.levelMax !== undefined) push(`Lv ${f.levelMin}–${f.levelMax}`);
  else if (f.levelMin !== undefined) push(`Lv ${f.levelMin}+`);
  else if (f.levelMax !== undefined) push(`Lv ≤${f.levelMax}`);

  if (f.priceMin !== undefined && f.priceMax !== undefined) push(`$${f.priceMin}–$${f.priceMax}`);
  else if (f.priceMin !== undefined) push(`$${f.priceMin}+`);
  else if (f.priceMax !== undefined) push(`≤$${f.priceMax}`);

  if (f.team) push(String(f.team));
  if (f.region) push(String(f.region));
  if (f.platform) push(String(f.platform));
  if (f.shinyMin) push(`Shiny ≥${f.shinyMin}`);
  if (f.legendaryMin) push(`Leg ≥${f.legendaryMin}`);
  if (f.hundoMin) push(`100% ≥${f.hundoMin}`);
  if (f.coinAmount) push(`${f.coinAmount} coins`);
  if (f.itemTypes) push(String(f.itemTypes));
  if (f.search) push(`“${String(f.search).slice(0, 24)}”`);

  return out;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never triggered yet';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'Just now';
  const m = Math.floor(diffMs / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SavedSearchesPage() {
  const { isAuthenticated, loading } = useAuth();
  const { data, isLoading } = useMySavedSearches(isAuthenticated);
  const updateMutation = useUpdateSavedSearch();
  const deleteMutation = useDeleteSavedSearch();

  React.useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      const next = encodeURIComponent('/profile/saved-searches');
      window.location.assign(`/auth/login?next=${next}`);
    }
  }, [loading, isAuthenticated]);

  const onToggleAlerts = async (row: SavedSearch) => {
    try {
      await updateMutation.mutateAsync({ id: row.id, emailAlerts: !row.emailAlerts });
      toast.success(
        row.emailAlerts ? 'Alerts paused for this search' : 'Alerts turned on',
      );
    } catch {
      toast.error('Could not update alerts');
    }
  };

  const onDelete = async (row: SavedSearch) => {
    if (!confirm(`Delete saved search "${row.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(row.id);
      toast.success('Saved search deleted');
    } catch {
      toast.error('Could not delete');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-3xl pt-24 pb-20">
        <div className="mb-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <Link href="/profile" className="hover:text-foreground">
              Profile
            </Link>
            <span aria-hidden className="mx-2">·</span>
            <span className="text-foreground">Saved searches</span>
          </nav>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Saved searches
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-xl">
            Get an email the moment a new listing matches your filters or a
            seller drops the price. Unsubscribe from individual searches any
            time.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {data.map((row) => {
              const chips = filterChips(row);
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-border/60 bg-surface/60 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[15px] md:text-base font-bold text-foreground leading-snug truncate">
                        {row.name}
                      </div>
                      {chips.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {chips.map((c) => (
                            <li
                              key={c}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-[hsl(var(--surface-elevated))] text-[11px] font-medium text-foreground/80"
                            >
                              {c}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Last triggered · {formatRelative(row.lastNotifiedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={viewAllUrlFor(row)}
                        className="inline-flex h-9 items-center gap-1 px-3 rounded-full text-[12.5px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)] transition-colors"
                      >
                        View
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleAlerts(row)}
                      disabled={updateMutation.isPending}
                      className={`inline-flex h-8 items-center gap-1.5 px-3 rounded-full text-[12px] font-semibold transition-colors ${
                        row.emailAlerts
                          ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.2)]'
                          : 'bg-[hsl(var(--muted-foreground)/0.1)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted-foreground)/0.18)]'
                      }`}
                    >
                      {row.emailAlerts ? (
                        <>
                          <Bell className="h-3.5 w-3.5" />
                          Alerts on
                        </>
                      ) : (
                        <>
                          <BellOff className="h-3.5 w-3.5" />
                          Paused
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete saved search"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--error)/0.1)] hover:text-[hsl(var(--error))] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[hsl(var(--primary)/0.1)] grid place-items-center">
        <Bell className="h-5 w-5 text-[hsl(var(--primary))]" />
      </div>
      <h2 className="font-display text-xl font-bold mb-1.5">
        No saved searches yet
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        Browse listings, apply your filters, then tap{' '}
        <span className="font-semibold text-foreground">Save this search</span>{' '}
        next to the sort dropdown to get email alerts on new matches.
      </p>
      <Link href="/games/pokemon-go/accounts">
        <Button size="lg" className="rounded-full">
          <Plus className="h-4 w-4" />
          Browse Pokémon GO accounts
        </Button>
      </Link>
    </div>
  );
}
