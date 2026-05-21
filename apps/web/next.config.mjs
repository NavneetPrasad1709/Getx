/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  /* Workspace packages now ship pre-built JS (main -> dist/index.js) so Node
     consumers like the NestJS API can require them. transpilePackages tells
     Next to keep transpiling them from `src/` so frontend dev doesn't need
     a workspace rebuild on every change. */
  transpilePackages: [
    '@getx/database',
    '@getx/games',
    '@getx/types',
    '@getx/utils',
    '@getx/ui',
  ],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'r2.dev' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.getx.gg' },
      { protocol: 'https', hostname: 'r2.getx.gg' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'videos.pexels.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    // We ship our own SVG illustrations from /public — locally authored, no user upload path.
    // Combined with CSP below for defense-in-depth.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    // @getx/ui re-exports hooks from framer-motion (useReducedMotion, useInView, etc.).
    // Next's barrel optimizer rewrites `import { x } from '@getx/ui'` into per-name
    // sub-path imports, which framer-motion re-exports don't support — runtime resolves
    // to undefined ("useReducedMotion is not a function"). Keep lucide-react optimized.
    optimizePackageImports: ['lucide-react'],
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

  async redirects() {
    const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'http://localhost:3001';
    return [
      { source: '/seller', destination: sellerUrl, permanent: false, basePath: false },
      { source: '/seller/:path*', destination: `${sellerUrl}/:path*`, permanent: false, basePath: false },
      { source: '/sell', destination: sellerUrl, permanent: false, basePath: false },
    ];
  },
};

export default nextConfig;
