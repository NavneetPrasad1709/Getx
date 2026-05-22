import { ImageResponse } from 'next/og';

/* Dynamic OG image for the landing page. Rendered on-edge via Satori + next/og
   so social-share previews always reflect current brand. Static cards age
   badly — locking colors + type in here means there's only one image to keep
   in sync. */

export const runtime = 'edge';

export const alt = 'GetX — Get gaming.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0A0A0B',
          position: 'relative',
          padding: '64px 80px',
          color: '#FFFFFF',
        }}
      >
        {/* Ambient cyan glow — top-left */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(700px 500px at 15% 25%, rgba(0, 229, 255, 0.32), transparent 60%)',
            display: 'flex',
          }}
        />
        {/* Ambient amber glow — bottom-right */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(560px 360px at 90% 90%, rgba(255, 184, 0, 0.18), transparent 60%)',
            display: 'flex',
          }}
        />
        {/* Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            display: 'flex',
            opacity: 0.4,
          }}
        />

        {/* Eyebrow chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid rgba(0, 229, 255, 0.35)',
            background: 'rgba(0, 229, 255, 0.07)',
            fontSize: 18,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#7DF9FF',
            fontWeight: 600,
            alignSelf: 'flex-start',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: '#00E5FF',
              boxShadow: '0 0 14px #00E5FF',
            }}
          />
          Premium gaming marketplace · India
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 2,
            marginTop: 36,
            lineHeight: 0.95,
            letterSpacing: -2,
          }}
        >
          <div
            style={{
              fontSize: 132,
              fontWeight: 900,
              color: '#FFFFFF',
              display: 'flex',
            }}
          >
            Trade gaming.
          </div>
          <div
            style={{
              fontSize: 132,
              fontWeight: 900,
              display: 'flex',
              background: 'linear-gradient(90deg, #00E5FF 0%, #7DF9FF 50%, #00E5FF 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Without the trust tax.
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: 64,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                fontSize: 18,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.55)',
                display: 'flex',
              }}
            >
              Escrow protected · UPI payouts · 5-min delivery
            </div>
            <div
              style={{
                fontSize: 26,
                color: '#FFFFFF',
                fontWeight: 600,
                display: 'flex',
              }}
            >
              getx.live
            </div>
          </div>

          {/* X mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: -2,
                display: 'flex',
              }}
            >
              GET
            </span>
            <svg width="84" height="84" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="og-x" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="50%" stopColor="#7DF9FF" />
                  <stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
              </defs>
              <path d="M10 6 L22 6 L54 58 L42 58 Z" fill="url(#og-x)" />
              <path d="M54 6 L42 6 L10 58 L22 58 Z" fill="url(#og-x)" opacity="0.92" />
              <path d="M40 22 L46 16 L48 22 Z" fill="url(#og-x)" opacity="0.6" />
            </svg>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
