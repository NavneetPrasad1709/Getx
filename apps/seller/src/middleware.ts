import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SAP-CRIT-002: server-side auth gate — replaces the client-side SellerGuard
// useEffect redirect which fired AFTER the bundle was already rendered and
// unauthorized API requests had already gone out.

const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/api'];

/* FE-001 — middleware runs server-side, so it needs an ABSOLUTE API origin.
   NEXT_PUBLIC_API_URL is now the relative same-origin proxy path ('/api/v1')
   which cannot be fetched here; API_UPSTREAM_URL is the source of truth. Only
   fall back to an absolute NEXT_PUBLIC_API_URL (legacy) or localhost (dev). */
function resolveApiRoot(): string {
  if (process.env.API_UPSTREAM_URL) return process.env.API_UPSTREAM_URL;
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub && /^https?:\/\//.test(pub)) return pub.replace(/\/api\/v1\/?$/, '');
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[seller middleware] API_UPSTREAM_URL is not set in production — set it to the API origin (https://api.getx.live).',
    );
  }
  return 'http://localhost:4000';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const apiRoot = resolveApiRoot();
  const webUrl =
    process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
  const sellerUrl =
    process.env.NEXT_PUBLIC_SELLER_URL ?? 'http://localhost:3001';

  try {
    const sessionRes = await fetch(`${apiRoot}/api/v1/auth/session`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      signal: AbortSignal.timeout(5000),
    });

    const data = (await sessionRes.json()) as {
      user?: { role?: string } | null;
    };

    if (!data.user) {
      const returnTo = `${sellerUrl}${pathname}`;
      return NextResponse.redirect(
        `${webUrl}/auth/login?next=${encodeURIComponent(returnTo)}`,
      );
    }
  } catch {
    const returnTo = `${sellerUrl}${pathname}`;
    return NextResponse.redirect(
      `${webUrl}/auth/login?next=${encodeURIComponent(returnTo)}`,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
