/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  /* Workspace packages now ship pre-built JS (main -> dist/index.js) so Node
     consumers like the NestJS API can require them. transpilePackages tells
     Next to keep transpiling them from `src/` so frontend dev doesn't need
     a workspace rebuild on every change. */
  /* PERF-010: @getx/database is intentionally NOT transpiled here — it pulls
     the Prisma client + engine into the frontend build graph. Frontend code
     consumes @getx/types only; the one server-side health route imports the
     package's prebuilt dist. */
  transpilePackages: [
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
      { protocol: 'https', hostname: 'cdn.getx.live' },
      { protocol: 'https', hostname: 'r2.getx.live' },
      { protocol: 'https', hostname: 'cdn.getx.gg' },
      { protocol: 'https', hostname: 'r2.getx.gg' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'videos.pexels.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    // WEB-HIGH-004: dangerouslyAllowSVG disabled — R2 remote patterns include
    // user-uploaded buckets; a malicious SVG with <script> becomes XSS
    dangerouslyAllowSVG: false,
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
    /* Content-Security-Policy locked down for the SPA. Allowances:
       - img-src includes data: (next/image placeholders + lucide SVGs)
         and Cloudflare R2 hosts (user avatars + uploads later).
       - script-src needs 'unsafe-inline' for Next's runtime
         streaming/hydration markers; we don't ship inline event
         handlers so this is bounded. 'unsafe-eval' is required for
         framer-motion's spring solver at the time of writing.
       - connect-src includes the Railway API + the WebSocket origin
         + Vercel analytics + Resend's tracking pixel (if used).
       - frame-ancestors 'none' blocks clickjacking; pairs with the
         X-Frame-Options: DENY header already set below for older
         browsers that don't honour CSP. */
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com https://cdn.getx.live https://r2.getx.live https://images.pexels.com https://videos.pexels.com https://image.crisp.chat",
      "media-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com https://cdn.getx.live",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // WEB-HIGH-001: drop 'unsafe-eval' — framer-motion 11+ no longer needs eval
      // WEB-HIGH-003: add Crisp chat CDN
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live https://client.crisp.chat",
      // WEB-HIGH-002: removed hardcoded Railway preview host (leaks infra + breaks on redeploy)
      // WEB-HIGH-003: Crisp websocket
      "connect-src 'self' wss://api.getx.live https://api.getx.live https://vitals.vercel-insights.com https://vercel.live wss://client.relay.crisp.chat https://client.crisp.chat",
      // WEB-HIGH-003: Crisp widget frame
      "frame-src https://game.crisp.chat",
      // WEB-MED-046: restrict workers to same-origin blobs only
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "child-src 'none'",
      'upgrade-insecure-requests',
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
