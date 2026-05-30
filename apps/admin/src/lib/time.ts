/**
 * Converts an ISO timestamp to a short human-readable "time ago" string.
 * e.g. "2m ago", "5h ago", "3d ago", "Jan 5, 2026".
 *
 * Extracted from the identical inline copies in orders/page and reviews/page.
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
