import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SAP-CRIT-001: server-side role gate — replaces the client-side-only AdminGuard.
// Without this, the full admin bundle ships to anonymous visitors before the
// React effect redirects them.

const PUBLIC_PREFIXES = ['/auth', '/_next', '/favicon.ico', '/api'];
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

/* FE-001 — middleware runs server-side and needs an ABSOLUTE API origin.
   NEXT_PUBLIC_API_URL is the relative same-origin proxy path ('/api/v1') and
   can't be fetched here; API_UPSTREAM_URL is the source of truth. */
function resolveApiRoot(): string {
  if (process.env.API_UPSTREAM_URL) return process.env.API_UPSTREAM_URL;
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub && /^https?:\/\//.test(pub)) return pub.replace(/\/api\/v1\/?$/, '');
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[admin middleware] API_UPSTREAM_URL is not set in production — set it to the API origin (https://api.getx.live).',
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
