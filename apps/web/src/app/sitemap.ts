import type { MetadataRoute } from 'next';
import { listComingSoonGames } from '@/lib/coming-soon-games';

const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://www.getx.live';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/* Pull the active listing slugs from the API so individual product
   pages get a sitemap entry — without this, Google has no path to
   discover any of the 16+ listings and the only indexed pages are the
   category roots. Fail soft: if the fetch errors during build, return
   the static entries unchanged so a flaky API never blocks deploys. */
type SitemapListing = { slug: string; tabType: string; updatedAt?: string };

async function fetchActiveListings(): Promise<SitemapListing[]> {
  try {
    const res = await fetch(`${API_URL}/listings?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: SitemapListing[] };
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: WEB_URL, lastModified: now, priority: 1.0, changeFrequency: 'daily' },
    {
      url: `${WEB_URL}/games`,
      lastModified: now,
      priority: 0.9,
      changeFrequency: 'weekly',
    },
    { url: `${WEB_URL}/games/pokemon-go`, lastModified: now, priority: 0.9 },
    {
      url: `${WEB_URL}/games/pokemon-go/accounts`,
      lastModified: now,
      priority: 0.8,
    },
    {
      url: `${WEB_URL}/games/pokemon-go/top-ups`,
      lastModified: now,
      priority: 0.8,
    },
    {
      url: `${WEB_URL}/games/pokemon-go/items`,
      lastModified: now,
      priority: 0.8,
    },
    {
      url: `${WEB_URL}/games/pokemon-go/boosting`,
      lastModified: now,
      priority: 0.8,
    },
    { url: `${WEB_URL}/how-it-works`, lastModified: now, priority: 0.6 },
    { url: `${WEB_URL}/trust`, lastModified: now, priority: 0.6 },
    { url: `${WEB_URL}/about`, lastModified: now, priority: 0.4 },
    { url: `${WEB_URL}/careers`, lastModified: now, priority: 0.3 },
    { url: `${WEB_URL}/refund`, lastModified: now, priority: 0.4 },
    { url: `${WEB_URL}/contact`, lastModified: now, priority: 0.4 },
    { url: `${WEB_URL}/terms`, lastModified: now, priority: 0.3 },
    { url: `${WEB_URL}/privacy`, lastModified: now, priority: 0.3 },
  ];

  // Pre-launch coming-soon pages — indexed for search intent ("buy
  // valorant accounts" etc.) so waitlist captures the demand.
  for (const g of listComingSoonGames()) {
    entries.push({
      url: `${WEB_URL}/games/${g.slug}/coming-soon`,
      lastModified: now,
      priority: 0.7,
      changeFrequency: 'weekly',
    });
  }

  // The 7 boosting service forms get their own URLs.
  const services = [
    'level-up',
    'xp-boost',
    'stardust-farming',
    'raid-service',
    'shiny-hunting',
    'legendary-catch',
    'event-grinding',
  ];
  for (const slug of services) {
    entries.push({
      url: `${WEB_URL}/games/pokemon-go/boosting/${slug}`,
      lastModified: now,
      priority: 0.7,
    });
  }

  /* Individual listing detail pages — these are the actual products
     buyers convert on, so each gets a sitemap entry pointing at the
     right tab subdirectory. tabType in the API is the Prisma enum
     (ACCOUNTS / TOP_UPS / ITEMS / BOOSTING) which maps to the URL
     slug by lowercase + underscore→dash. */
  const TAB_TO_PATH: Record<string, string> = {
    ACCOUNTS: 'accounts',
    TOP_UPS: 'top-ups',
    ITEMS: 'items',
  };
  const listings = await fetchActiveListings();
  for (const L of listings) {
    const path = TAB_TO_PATH[L.tabType];
    if (!path) continue; // BOOSTING handled by service URLs above
    entries.push({
      url: `${WEB_URL}/games/pokemon-go/${path}/${L.slug}`,
      lastModified: L.updatedAt ? new Date(L.updatedAt) : now,
      priority: 0.7,
      changeFrequency: 'daily',
    });
  }

  return entries;
}
