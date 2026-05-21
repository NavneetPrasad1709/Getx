import type { MetadataRoute } from 'next';

const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://www.getx.live';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/games', '/users', '/how-it-works', '/trust'],
        disallow: ['/auth/', '/profile/', '/orders/', '/messages', '/requests/new'],
      },
    ],
    sitemap: `${WEB_URL}/sitemap.xml`,
  };
}
