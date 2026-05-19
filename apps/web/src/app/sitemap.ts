import type { MetadataRoute } from 'next';
import { listComingSoonGames } from '@/lib/coming-soon-games';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://getx.gg';

export default function sitemap(): MetadataRoute.Sitemap {
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

  return entries;
}
