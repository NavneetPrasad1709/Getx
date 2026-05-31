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
        ],
      },
    ];
  },
};

export default nextConfig;
