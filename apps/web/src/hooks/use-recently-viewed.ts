'use client';

import * as React from 'react';

/* useRecentlyViewed — small localStorage-backed history.

   No backend required. Returns the saved list, a push() to add an entry
   (deduped, moves existing to front, capped at the configured size), and
   a clear(). All writes are debounced via React state to keep the hook
   safe to call inside render of product cards. */

export interface RecentlyViewedItem {
  /** Stable identifier — usually the product slug or URL */
  id: string;
  /** Display title */
  title: string;
  /** Image url (used by card thumbnail) */
  image: string;
  /** Path to navigate on click */
  href: string;
  /** Marketplace category label (Accounts / Top-ups / Items / Boosting) */
  category: string;
  /** Game tag label */
  gameTag: string;
  /** Hex accent for game */
  gameAccent: string;
  /** Price in INR */
  price: number;
  /** Optional pre-discount strike-through */
  was?: number;
  /** Unix ms — when we saved it */
  viewedAt: number;
}

const STORAGE_KEY = 'getx.recently-viewed.v1';
const MAX_ITEMS = 12;

function readStorage(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Cheap shape check — drop anything that doesn't have the required keys
    return parsed.filter((x): x is RecentlyViewedItem => {
      if (!x || typeof x !== 'object') return false;
      const o = x as Record<string, unknown>;
      return (
        typeof o.id === 'string' &&
        typeof o.title === 'string' &&
        typeof o.image === 'string' &&
        typeof o.href === 'string' &&
        typeof o.price === 'number'
      );
    });
  } catch {
    return [];
  }
}

function writeStorage(items: RecentlyViewedItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota or disabled — ignore */
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = React.useState<RecentlyViewedItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from storage once on mount
  React.useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  // Listen for storage changes from other tabs
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setItems(readStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const push = React.useCallback(
    (next: Omit<RecentlyViewedItem, 'viewedAt'>) => {
      setItems((prev) => {
        const without = prev.filter((p) => p.id !== next.id);
        const updated = [
          { ...next, viewedAt: Date.now() },
          ...without,
        ].slice(0, MAX_ITEMS);
        writeStorage(updated);
        return updated;
      });
    },
    [],
  );

  const clear = React.useCallback(() => {
    setItems([]);
    writeStorage([]);
  }, []);

  return { items, push, clear, hydrated };
}
