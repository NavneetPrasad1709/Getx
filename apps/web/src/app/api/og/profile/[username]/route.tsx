import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/* OG image generator for shareable user profiles.
   Returns a 1200×630 PNG that social cards (Twitter / Discord / iMessage /
   Slack / etc.) crawl and embed when a buyer pastes a profile link.

   Layout: avatar circle + display name + @handle + rank chip +
   ★ rating · sales count · country · "Online now" if applicable +
   GETX wordmark in the corner.

   Renders server-side via Next's ImageResponse. No external SDKs. */

export const runtime = 'nodejs';

const OG_SIZE = { width: 1200, height: 630 };

interface PublicProfile {
  username: string | null;
  name: string | null;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  country: string;
  sellerRating: number;
  totalSales: number;
  totalReviews: number;
  rank: string;
  isVerified: boolean;
  isOnline: boolean;
}

const RANK_COLOR: Record<string, string> = {
  ROOKIE: '#94a3b8',
  RISING: '#0038ff',
  TRUSTED: '#10b981',
  PRO: '#7c3aed',
  ELITE: '#ffcb05',
  LEGEND: '#ff3b5c',
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      `${API_URL}/users/by-username/${encodeURIComponent(username)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await fetchProfile(username);

  const display =
    profile?.displayName ?? profile?.name ?? profile?.username ?? username;
  const handle = profile?.username ?? username;
  const initial = display.charAt(0).toUpperCase();
  const rank = profile?.rank ?? 'ROOKIE';
  const rankColor = RANK_COLOR[rank] ?? RANK_COLOR.ROOKIE;
  const rating = profile?.sellerRating ?? 0;
  const sales = profile?.totalSales ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background:
            'linear-gradient(135deg, #0F0C26 0%, #1a1142 50%, #0038ff 100%)',
          color: '#ffffff',
          fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top bar — brand + rank chip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            GETX
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 22px',
              borderRadius: 999,
              background: `${rankColor}33`,
              border: `2px solid ${rankColor}`,
              color: rankColor,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            {rank}
          </div>
        </div>

        {/* Body — avatar + identity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 220,
              height: 220,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #0038ff 0%, #7c3aed 100%)',
              fontSize: 110,
              fontWeight: 900,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            {initial}
            {profile?.isOnline ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: 9999,
                  background: '#10b981',
                  border: '6px solid #0F0C26',
                }}
              />
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: '#ffffff',
              }}
            >
              {display}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: '#a5b4fc',
              }}
            >
              @{handle}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 24,
                marginTop: 12,
                fontSize: 26,
                color: 'rgba(255,255,255,0.85)',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#FFCB05', fontSize: 30 }}>★</span>
                <span style={{ fontWeight: 800 }}>{rating.toFixed(2)}</span>
              </div>
              <div>·</div>
              <div>
                <span style={{ fontWeight: 800 }}>{sales}</span>
                <span style={{ marginLeft: 6, opacity: 0.7 }}>sales</span>
              </div>
              {profile?.country ? (
                <>
                  <div>·</div>
                  <div>{profile.country}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom strip — tagline */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          <div>The global gaming marketplace · getx.gg</div>
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            GETX SHIELD · ESCROW PROTECTED
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
