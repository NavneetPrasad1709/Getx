import * as React from 'react';

/* CategoryTileArt — stylised SVG posters behind each marketplace category
   (Accounts / Top-ups / Items / Boosting). Visual hierarchy: pure black
   ground, sharp yellow primary, white linework. No gradients used outside
   the floor wash. Each tile is built to read at 16:9 and crop gracefully
   to 4:5 on mobile. */

interface ArtProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
}

function Floor() {
  return (
    <>
      <defs>
        <linearGradient id="ct-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(0 0% 0%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(0 0% 0%)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect y="380" width="800" height="220" fill="url(#ct-floor)" />
    </>
  );
}

/* Accounts — stylised trainer card */
export function AccountsArt({ className, ...props }: ArtProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="800" height="600" fill="hsl(0 0% 0%)" />
      {/* Star field */}
      <g fill="hsl(41 97% 54%)" opacity="0.7">
        {[
          [120, 60, 1.5],
          [200, 110, 1],
          [350, 70, 2],
          [520, 50, 1],
          [620, 130, 1.5],
          [710, 90, 1],
          [80, 200, 1],
          [680, 240, 1.5],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
      {/* Trainer silhouette card */}
      <g transform="translate(400 320)">
        <rect
          x="-180"
          y="-160"
          width="360"
          height="320"
          rx="6"
          fill="hsl(0 0% 6%)"
          stroke="hsl(41 97% 54%)"
          strokeWidth="3"
        />
        {/* Header bar */}
          <rect x="-180" y="-160" width="360" height="48" fill="hsl(41 97% 54%)" />
          <text
            x="-160"
            y="-130"
            fill="hsl(0 0% 0%)"
            fontFamily="var(--font-display)"
            fontSize="22"
            fontWeight="700"
            letterSpacing="2"
          >
            LVL 50 · VALOR
          </text>
        {/* Avatar circle */}
        <circle cx="0" cy="-30" r="64" fill="hsl(357 100% 50%)" />
        <circle cx="0" cy="-30" r="64" fill="none" stroke="hsl(0 0% 100%)" strokeWidth="3" />
        <path
          d="M -36 -30 a 36 36 0 0 1 72 0 Z"
          fill="hsl(0 0% 0%)"
          opacity="0.4"
        />
        {/* Stat rows */}
        <g fill="hsl(0 0% 100%)" opacity="0.85">
          <rect x="-140" y="60" width="240" height="6" rx="3" />
          <rect x="-140" y="78" width="180" height="6" rx="3" opacity="0.6" />
          <rect x="-140" y="96" width="200" height="6" rx="3" opacity="0.6" />
        </g>
        {/* Shiny chip */}
        <g transform="translate(80 70)">
          <rect x="-30" y="-12" width="60" height="24" rx="4" fill="hsl(41 97% 54%)" />
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fill="hsl(0 0% 0%)"
            fontFamily="var(--font-mono, monospace)"
            fontSize="11"
            fontWeight="700"
          >
            ★ 312
          </text>
        </g>
      </g>
      <Floor />
    </svg>
  );
}

/* Top-ups — coin stack */
export function TopUpsArt({ className, ...props }: ArtProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="800" height="600" fill="hsl(0 0% 0%)" />
      {/* Coin stack */}
      <g transform="translate(400 360)">
        {[
          { y: 0, w: 220, h: 56, fill: 'hsl(41 97% 54%)' },
          { y: -56, w: 200, h: 50, fill: 'hsl(41 100% 60%)' },
          { y: -106, w: 180, h: 44, fill: 'hsl(41 97% 54%)' },
          { y: -150, w: 160, h: 40, fill: 'hsl(41 100% 60%)' },
          { y: -190, w: 140, h: 36, fill: 'hsl(41 97% 54%)' },
        ].map((c, i) => (
          <g key={i} transform={`translate(0 ${c.y})`}>
            <ellipse cx="0" cy={c.h / 2} rx={c.w / 2} ry={c.h / 4} fill="hsl(0 0% 0%)" opacity="0.4" />
            <rect x={-c.w / 2} y="0" width={c.w} height={c.h - 8} fill={c.fill} />
            <ellipse cx="0" cy="0" rx={c.w / 2} ry={c.h / 4} fill="hsl(0 0% 100%)" opacity="0.18" />
            <text
              x="0"
              y={c.h / 2 - 2}
              textAnchor="middle"
              fill="hsl(0 0% 0%)"
              fontFamily="var(--font-display)"
              fontSize={c.h * 0.55}
              fontWeight="700"
              letterSpacing="2"
            >
              $
            </text>
          </g>
        ))}
      </g>
      {/* Sparks */}
      <g fill="hsl(41 97% 54%)" opacity="0.85">
        {[
          [120, 120],
          [680, 90],
          [110, 250],
          [690, 240],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M 0 -10 L 3 -3 L 10 0 L 3 3 L 0 10 L -3 3 L -10 0 L -3 -3 Z" />
          </g>
        ))}
      </g>
      <Floor />
    </svg>
  );
}

/* Items — geometric crate / loot */
export function ItemsArt({ className, ...props }: ArtProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="800" height="600" fill="hsl(0 0% 0%)" />
      {/* Crate isometric */}
      <g transform="translate(400 340)">
        {/* Top */}
        <polygon
          points="0,-160 180,-100 0,-40 -180,-100"
          fill="hsl(41 100% 60%)"
        />
        {/* Left */}
        <polygon
          points="-180,-100 -180,80 0,140 0,-40"
          fill="hsl(41 97% 54%)"
        />
        {/* Right */}
        <polygon
          points="180,-100 180,80 0,140 0,-40"
          fill="hsl(41 80% 40%)"
        />
        {/* Crate cross */}
        <line x1="-180" y1="-10" x2="0" y2="50" stroke="hsl(0 0% 0%)" strokeWidth="3" opacity="0.6" />
        <line x1="180" y1="-10" x2="0" y2="50" stroke="hsl(0 0% 0%)" strokeWidth="3" opacity="0.6" />
        <line x1="0" y1="-40" x2="0" y2="140" stroke="hsl(0 0% 0%)" strokeWidth="3" opacity="0.4" />
        {/* Lock */}
        <g transform="translate(0 0)">
          <rect x="-22" y="-10" width="44" height="36" rx="4" fill="hsl(0 0% 0%)" />
          <path
            d="M -14 -10 v -16 a 14 14 0 0 1 28 0 v 16"
            fill="none"
            stroke="hsl(0 0% 0%)"
            strokeWidth="4"
          />
          <circle cx="0" cy="8" r="3" fill="hsl(41 97% 54%)" />
        </g>
      </g>
      {/* Floating tokens */}
      <g fill="hsl(0 0% 100%)" opacity="0.75">
        <polygon points="120,140 132,120 144,140 132,160" />
        <polygon points="660,180 672,160 684,180 672,200" />
        <polygon points="700,420 712,400 724,420 712,440" />
      </g>
      <Floor />
    </svg>
  );
}

/* Boosting — XP arrow rising */
export function BoostingArt({ className, ...props }: ArtProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="800" height="600" fill="hsl(0 0% 0%)" />
      {/* Grid floor */}
      <g stroke="hsl(41 97% 54%)" opacity="0.25" strokeWidth="1">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * 800) / 16} y1="380" x2={400} y2="520" />
        ))}
        {[420, 460, 500].map((y, i) => (
          <line key={`h${i}`} x1="0" y1={y} x2="800" y2={y} />
        ))}
      </g>
      {/* Bars rising */}
      <g transform="translate(180 420)">
        {[
          { x: 0, h: 60, c: 'hsl(0 0% 22%)' },
          { x: 70, h: 100, c: 'hsl(0 0% 32%)' },
          { x: 140, h: 140, c: 'hsl(41 60% 32%)' },
          { x: 210, h: 200, c: 'hsl(41 80% 44%)' },
          { x: 280, h: 280, c: 'hsl(41 97% 54%)' },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={-b.h} width="46" height={b.h} fill={b.c} />
        ))}
      </g>
      {/* Diagonal arrow */}
      <g transform="translate(0 0)">
        <path
          d="M 160 440 L 640 100 L 600 100 M 640 100 L 640 140"
          fill="none"
          stroke="hsl(41 97% 54%)"
          strokeWidth="10"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
      <Floor />
    </svg>
  );
}
