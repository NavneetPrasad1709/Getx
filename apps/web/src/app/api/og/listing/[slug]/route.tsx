import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/* OG image generator for shareable listing PDPs.
   1200×630 PNG with: title (line-clamped), big price, seller handle +
   rating, "GETX Shield · Insured" badge, GETX wordmark. */

export const runtime = 'nodejs';

/* OG image dimensions — hardcoded into the ImageResponse call below.
   Next route handlers don't accept `size` / `contentType` exports
   (those belong to `opengraph-image.tsx` file conventions). */
const OG_SIZE = { width: 1200, height: 630 };

interface ListingPayload {
  title: string;
  price: number;
  currency: string;
  originalPrice: number | null;
  tabType: string;
  seller: {
    username: string | null;
    name: string | null;
    sellerRating: number;
    isVerified: boolean;
  };
  game: { name: string; slug: string };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function fetchListing(slug: string): Promise<ListingPayload | null> {
  try {
    /* Revalidate the underlying listing payload every 10 minutes — OG
       previews don't need real-time pricing, and social crawlers
       (Twitter, Discord, Slack, iMessage) hammer this endpoint on
       every link share. */
    const res = await fetch(`${API_URL}/listings/${encodeURIComponent(slug)}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ListingPayload;
  } catch {
    return null;
  }
}

/* CDN cache for the rendered PNG itself — keeps the actual ImageResponse
   bytes warm in Vercel's edge for an hour, with a longer s-maxage for
   shared-cache reuse and stale-while-revalidate so an expired entry
   serves instantly while a fresh render runs in the background. */
const OG_CACHE_HEADERS = {
  'Cache-Control':
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

function formatPrice(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase();
  /* INR/JPY/KRW render with zero decimals; everything else with 2. */
  const zeroDec = ['JPY', 'KRW', 'INR'].includes(code);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: zeroDec ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(zeroDec ? 0 : 2)}`;
  }
}

const TAB_LABEL: Record<string, string> = {
  ACCOUNTS: 'Account',
  TOP_UPS: 'Top-up',
  ITEMS: 'Items',
  BOOSTING: 'Boosting',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const listing = await fetchListing(slug);

  const title = listing?.title ?? 'Drop on GETX';
  const price = listing?.price ?? 0;
  const currency = listing?.currency ?? 'USD';
  const originalPrice = listing?.originalPrice ?? null;
  const tab = listing?.tabType ?? 'ACCOUNTS';
  const sellerHandle =
    listing?.seller.username ?? listing?.seller.name ?? 'seller';
  const sellerRating = listing?.seller.sellerRating ?? 0;
  const sellerVerified = listing?.seller.isVerified ?? false;
  const gameName = listing?.game.name ?? 'Pokémon GO';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 72px',
          background:
            'linear-gradient(135deg, #0F0C26 0%, #1a1142 50%, #0038ff 100%)',
          color: '#ffffff',
          fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top bar — brand + category chip + game */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: '-0.02em',
            }}
          >
            GETX
          </div>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {gameName}
            </div>
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                background: 'rgba(0,56,255,0.3)',
                border: '1px solid #0038ff',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {TAB_LABEL[tab] ?? tab}
            </div>
          </div>
        </div>

        {/* Body — title */}
        <div
          style={{
            marginTop: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              maxWidth: 1000,
              /* clamp to ~3 lines so very long titles don't overflow */
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>

          {/* Price + savings */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: '#FFCB05',
                lineHeight: 1,
              }}
            >
              {formatPrice(price, currency)}
            </div>
            {originalPrice && originalPrice > price ? (
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'line-through',
                }}
              >
                {formatPrice(originalPrice, currency)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom strip — seller + Shield badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 32,
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: 9999,
                background: 'linear-gradient(135deg, #0038ff 0%, #7c3aed 100%)',
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {sellerHandle.charAt(0).toUpperCase()}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                @{sellerHandle}
                {sellerVerified ? (
                  <span style={{ color: '#0038ff', fontSize: 22 }}>✓</span>
                ) : null}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <span style={{ color: '#FFCB05' }}>★</span>
                <span>{sellerRating.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.18)',
              border: '1px solid #10b981',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#10b981',
            }}
          >
            🛡 GETX SHIELD · INSURED
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, headers: OG_CACHE_HEADERS },
  );
}
