'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `ms`
 * milliseconds of silence. Use for search inputs that trigger API calls so
 * the server is hit once when the user pauses, not on every keystroke.
 *
 * Centralised here to eliminate the identical inline copies that existed in
 * users/page and audit-logs/page.
 */
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
