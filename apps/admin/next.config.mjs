/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  /* Workspace packages now ship pre-built JS (main -> dist/index.js) so Node
     consumers like the NestJS API can require them. transpilePackages tells
     Next to keep transpiling them from `src/` so frontend dev doesn't need
     a workspace rebuild on every change. */
  // PERF-010: @getx/database (Prisma) is not part of the frontend build graph.
  transpilePackages: ['@getx/games', '@getx/types', '@getx/utils', '@getx/ui'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'r2.dev' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.getx.live' },
      { protocol: 'https', hostname: 'r2.getx.live' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    optimizePackageImports: ['@getx/ui'],
  },

  async rewrites() {
    const apiUpstream =
      process.env.API_UPSTREAM_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUpstream}/api/:path*`,
      },
    ];
  },

  async headers() {
    /* P6-T2 / APPSEC-001: strict CSP for the admin console. The admin app
       talks to the API only through the same-origin /api proxy ('self'); the
       API origin is included defensively. No buyer-only allowances. */
    const isProd = process.env.NODE_ENV === 'production';
    const apiOrigin =
      process.env.API_UPSTREAM_URL ||
      process.env.NEXT_PUBLIC_API_DIRECT_URL ||
      (isProd ? 'https://api.getx.live' : 'http://localhost:4000');
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com https://cdn.getx.live https://r2.getx.live",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
      `connect-src 'self' ${apiOrigin} https://vitals.vercel-insights.com https://vercel.live`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "child-src 'none'",
      ...(isProd ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
