'use client';

import * as React from 'react';
import type { Listing } from '@/hooks/use-listings';

/* use-wishlist — local-first wishlist.

   Listings the buyer saves are persisted to localStorage so the experience
   works without round-trips to the backend; when a server-side endpoint
   ships, the toggleSaved/serialised shape here can swap to a mutation
   without touching call-sites.

   We store a lightweight snapshot per saved listing (title, price, cover,
   game slug) so /profile/wishlist can render without re-querying. Cross-tab
   syncing rides the browser's `storage` event.
*/

const STORAGE_KEY = 'getx:wishlist:v1';
const EVENT_NAME = 'getx:wishlist:change';

export interface WishlistEntry {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  currency: string;
  cover: string | null;
  gameSlug: string;
  tabType: string;
  savedAt: string;
}

function entryFromListing(l: Listing): WishlistEntry {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    price: l.price,
    currency: l.currency,
    cover: l.images?.[0] ?? null,
    gameSlug: l.game.slug,
    tabType: l.tabType,
    savedAt: new Date().toISOString(),
  };
}

/** Lightweight shape callers can pass when they don't have a full
 *  Listing object (e.g. homepage marketplace rails that work off mock
 *  RailProduct entries). The shape is intentionally a subset of
 *  WishlistEntry — `id` is whatever stable identifier the caller has
 *  (href / slug / sku) so dedupe works. */
export interface WishlistSummary {
  id: string;
  title: string;
  price: number;
  cover: string | null;
  currency?: string;
  slug?: string | null;
  gameSlug?: string;
  tabType?: string;
}

function entryFromSummary(s: WishlistSummary): WishlistEntry {
  return {
    id: s.id,
    slug: s.slug ?? null,
    title: s.title,
    price: s.price,
    currency: s.currency ?? 'INR',
    cover: s.cover,
    gameSlug: s.gameSlug ?? 'pokemon-go',
    tabType: s.tabType ?? 'ACCOUNTS',
    savedAt: new Date().toISOString(),
  };
}

function readAll(): WishlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: WishlistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // Silent: quota exceeded or private-mode storage refusal — wishlist is a
    // nice-to-have, not a paid feature.
  }
}

export function useWishlist() {
  const [entries, setEntries] = React.useState<WishlistEntry[]>(() => readAll());

  React.useEffect(() => {
    setEntries(readAll());
    const sync = () => setEntries(readAll());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isSaved = React.useCallback(
    (id: string) => entries.some((e) => e.id === id),
    [entries],
  );

  const toggle = React.useCallback(
    (listing: Listing): { saved: boolean } => {
      const next = readAll();
      const idx = next.findIndex((e) => e.id === listing.id);
      if (idx >= 0) {
        next.splice(idx, 1);
        writeAll(next);
        setEntries(next);
        return { saved: false };
      }
      const entry = entryFromListing(listing);
      next.unshift(entry);
      writeAll(next);
      setEntries(next);
      return { saved: true };
    },
    [],
  );

  const toggleSummary = React.useCallback(
    (summary: WishlistSummary): { saved: boolean } => {
      const next = readAll();
      const idx = next.findIndex((e) => e.id === summary.id);
      if (idx >= 0) {
        next.splice(idx, 1);
        writeAll(next);
        setEntries(next);
        return { saved: false };
      }
      next.unshift(entryFromSummary(summary));
      writeAll(next);
      setEntries(next);
      return { saved: true };
    },
    [],
  );

  const remove = React.useCallback((id: string) => {
    const next = readAll().filter((e) => e.id !== id);
    writeAll(next);
    setEntries(next);
  }, []);

  const clear = React.useCallback(() => {
    writeAll([]);
    setEntries([]);
  }, []);

  return {
    entries,
    isSaved,
    toggle,
    toggleSummary,
    remove,
    clear,
    count: entries.length,
  };
}
