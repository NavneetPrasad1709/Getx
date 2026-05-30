import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SAP-CRIT-002: server-side auth gate — replaces the client-side SellerGuard
// useEffect redirect which fired AFTER the bundle was already rendered and
// unauthorized API requests had already gone out.

const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/api'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const apiRoot =
    process.env.API_UPSTREAM_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ??
    'http://localhost:4000';
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
