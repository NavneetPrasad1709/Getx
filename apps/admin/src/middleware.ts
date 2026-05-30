import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SAP-CRIT-001: server-side role gate — replaces the client-side-only AdminGuard.
// Without this, the full admin bundle ships to anonymous visitors before the
// React effect redirects them.

const PUBLIC_PREFIXES = ['/auth', '/_next', '/favicon.ico', '/api'];
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const apiRoot =
    process.env.API_UPSTREAM_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ??
    'http://localhost:4000';

  try {
    const sessionRes = await fetch(`${apiRoot}/api/v1/auth/session`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      signal: AbortSignal.timeout(5000),
    });

    const data = (await sessionRes.json()) as {
      user?: { role?: string } | null;
    };
    const role = data.user?.role;

    if (!role || !ADMIN_ROLES.has(role)) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/login';
      url.search = `?next=${encodeURIComponent(req.url)}&error=admin_required`;
      return NextResponse.redirect(url);
    }
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = `?next=${encodeURIComponent(req.url)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
