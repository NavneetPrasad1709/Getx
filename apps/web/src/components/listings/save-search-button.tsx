'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { toast } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useCreateSavedSearch,
  useMySavedSearches,
} from '@/hooks/use-saved-searches';

/* SaveSearchButton — renders next to the sort dropdown on category index
   pages. Snapshots the active filter params (URL searchParams + the static
   gameSlug/tabType context) and creates a SavedSearch row server-side.

   When a saved row already matches the current filter signature, the
   button flips to "✓ Saved · Manage alerts" linking the buyer to their
   saved-searches page. */

interface Props {
  gameSlug: string;
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';
  className?: string;
}

/* Stable signature of a filter set — order-independent string used to
   detect "already saved" matches without a server round-trip per click. */
function signatureOf(filters: Record<string, unknown>): string {
  const keys = Object.keys(filters).sort();
  return keys
    .map((k) => {
      const v = filters[k];
      if (v === undefined || v === null || v === '') return null;
      return `${k}=${String(v)}`;
    })
    .filter(Boolean)
    .join('&');
}

function paramsToFilters(
  searchParams: URLSearchParams,
  gameSlug: string,
  tabType: 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS',
): Record<string, unknown> {
  const out: Record<string, unknown> = { gameSlug, tabType };
  /* Whitelist of filter keys we know the cron can replay safely. Drops
     any cosmetic params like ?page= or ?sort=. */
  const KEYS = [
    'priceMin',
    'priceMax',
    'search',
    'levelMin',
    'levelMax',
    'team',
    'shinyMin',
    'legendaryMin',
    'hundoMin',
    'region',
    'platform',
    'coinAmount',
    'deliveryMethod',
    'itemTypes',
    'quantityMin',
  ];
  for (const k of KEYS) {
    const raw = searchParams.get(k);
    if (raw === null || raw === '') continue;
    /* Numeric coercion mirrors the listings list DTO. */
    if (
      k.endsWith('Min') ||
      k.endsWith('Max') ||
      k === 'priceMin' ||
      k === 'priceMax'
    ) {
      const n = Number(raw);
      if (!Number.isNaN(n)) out[k] = n;
    } else {
      out[k] = raw;
    }
  }
  return out;
}

export function SaveSearchButton({ gameSlug, tabType, className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { data: saved } = useMySavedSearches(isAuthenticated);
  const createSavedSearch = useCreateSavedSearch();

  const filters = React.useMemo(
    () => paramsToFilters(new URLSearchParams(searchParams.toString()), gameSlug, tabType),
    [searchParams, gameSlug, tabType],
  );
  const currentSig = signatureOf(filters);

  /* Match the current filter signature against the user's saved set. */
  const matched = React.useMemo(() => {
    if (!saved) return null;
    return (
      saved.find(
        (row) =>
          signatureOf((row.filters as Record<string, unknown>) ?? {}) === currentSig,
      ) ?? null
    );
  }, [saved, currentSig]);

  const onSave = async () => {
    if (!isAuthenticated) {
      toast.info('Log in to save this search');
      const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      router.push(`/auth/login?next=${encodeURIComponent(here)}`);
      return;
    }
    try {
      await createSavedSearch.mutateAsync({ filters });
      toast.success('Search saved · we’ll email you on new matches');
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not save search');
    }
  };

  if (matched) {
    return (
      <Link
        href="/profile/saved-searches"
        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[hsl(var(--success)/0.45)] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] text-[13px] font-semibold hover:bg-[hsl(var(--success)/0.18)] transition-colors ${className ?? ''}`}
      >
        <BellRing className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Saved · Manage alerts</span>
        <span className="sm:hidden">Saved</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={createSavedSearch.isPending}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))] text-[13px] font-semibold hover:bg-[hsl(var(--primary)/0.12)] transition-colors disabled:opacity-60 ${className ?? ''}`}
    >
      {createSavedSearch.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">Save this search</span>
      <span className="sm:hidden">Save</span>
    </button>
  );
}
