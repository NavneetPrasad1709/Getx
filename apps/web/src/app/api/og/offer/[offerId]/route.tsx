import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/* OG image generator for public offer share URLs.
   1200×630 PNG: offer price + delivery + request title + seller pitch
   + GETX Shield badge. Read-only — only consumed by social crawlers
   and link previews. */

export const runtime = 'nodejs';

const OG_SIZE = { width: 1200, height: 630 };

interface PublicOffer {
  price: number;
  currency: string;
  deliveryHours: number;
  message: string;
  status: string;
  request: { title: string; tabType: string };
  seller: {
    username: string | null;
    name: string | null;
    sellerRating: number;
    rank: string | null;
    isVerified: boolean;
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function fetchOffer(id: string): Promise<PublicOffer | null> {
  try {
    /* Revalidate every 10 minutes — see listing OG route for rationale. */
    const res = await fetch(`${API_URL}/offers/${encodeURIComponent(id)}/public`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicOffer;
  } catch {
    return null;
  }
}

const OG_CACHE_HEADERS = {
  'Cache-Control':
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

function formatPrice(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase();
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await params;
  const offer = await fetchOffer(offerId);

  const price = offer?.price ?? 0;
  const currency = offer?.currency ?? 'USD';
  const deliveryHours = offer?.deliveryHours ?? 0;
  const requestTitle = offer?.request.title ?? 'Custom request on GETX';
  const sellerHandle =
    offer?.seller.username ?? offer?.seller.name ?? 'seller';
  const sellerRating = offer?.seller.sellerRating ?? 0;
  const sellerVerified = offer?.seller.isVerified ?? false;
  const message = (offer?.message ?? '').slice(0, 220);
  const status = offer?.status ?? 'PENDING';

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
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' }}
          >
            GETX
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
              CUSTOM OFFER
            </div>
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                background:
                  status === 'PENDING'
                    ? 'rgba(16,185,129,0.22)'
                    : 'rgba(255,255,255,0.1)',
                border:
                  status === 'PENDING'
                    ? '1px solid #10b981'
                    : '1px solid rgba(255,255,255,0.2)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: status === 'PENDING' ? '#10b981' : 'rgba(255,255,255,0.7)',
              }}
            >
              {status}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            marginTop: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 1000,
            }}
          >
            re: {requestTitle}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 900,
                color: '#FFCB05',
                lineHeight: 1,
              }}
            >
              {formatPrice(price, currency)}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              · delivery in {deliveryHours}h
            </div>
          </div>
          {message ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                color: 'rgba(255,255,255,0.78)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: 1000,
              }}
            >
              &ldquo;{message}&rdquo;
            </div>
          ) : null}
        </div>

        {/* Bottom strip — seller + Shield */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 22,
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
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
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
                  <span style={{ color: '#0038ff', fontSize: 20 }}>✓</span>
                ) : null}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 17,
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
            🛡 GETX SHIELD · ESCROWED
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, headers: OG_CACHE_HEADERS },
  );
}
