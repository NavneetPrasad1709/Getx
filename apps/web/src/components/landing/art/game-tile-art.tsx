import * as React from 'react';

/* GameTileArt — pure-SVG illustrations used as full-bleed art behind each
   game tile on the landing page. Rockstar's tiles are licensed game key-art;
   ours are stylised geometric posters keyed to each game's mood. SVG keeps
   them razor-sharp at hero scale and tiny in payload. */

interface ArtProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
}

/* Pokémon GO — circular pokéball motif on a sunburst, in our brand yellow. */
export function PokemonGoArt({ className, ...props }: ArtProps) {
  return (
    <svg
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <defs>
        <radialGradient id="pg-sun" cx="50%" cy="60%" r="65%">
          <stop offset="0%" stopColor="hsl(41 100% 58%)" stopOpacity="0.85" />
          <stop offset="60%" stopColor="hsl(41 100% 50%)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(0 0% 0%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pg-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(0 0% 0%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(0 0% 0%)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="hsl(0 0% 0%)" />
      {/* Sunburst rays */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i * 20 * Math.PI) / 180;
        const x1 = 600 + Math.cos(angle) * 80;
        const y1 = 420 + Math.sin(angle) * 80;
        const x2 = 600 + Math.cos(angle) * 900;
        const y2 = 420 + Math.sin(angle) * 900;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="hsl(41 97% 54%)"
            strokeWidth={i % 2 === 0 ? '3' : '1.5'}
            opacity={i % 2 === 0 ? '0.18' : '0.08'}
          />
        );
      })}
      <ellipse cx="600" cy="420" rx="640" ry="320" fill="url(#pg-sun)" />
      {/* Pokéball silhouette */}
      <g transform="translate(600 420)">
        <circle r="220" fill="hsl(0 0% 0%)" stroke="hsl(41 97% 54%)" strokeWidth="6" />
        <path
          d="M -220 0 A 220 220 0 0 1 220 0 Z"
          fill="hsl(357 100% 50%)"
          opacity="0.95"
        />
        <rect x="-220" y="-12" width="440" height="24" fill="hsl(0 0% 0%)" />
        <circle r="56" fill="hsl(0 0% 0%)" stroke="hsl(0 0% 100%)" strokeWidth="6" />
        <circle r="22" fill="hsl(0 0% 100%)" />
      </g>
      <rect y="500" width="1200" height="200" fill="url(#pg-floor)" />
    </svg>
  );
}

/* Generic "coming soon" — moody geometric grid for upcoming game tiles. */
export function ComingSoonArt({ className, ...props }: ArtProps) {
  return (
    <svg
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <defs>
        <linearGradient id="cs-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(0 0% 0%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(0 0% 0%)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="hsl(0 0% 6%)" />
      {/* Perspective grid */}
      <g stroke="hsl(41 97% 54%)" strokeWidth="1" opacity="0.18">
        {Array.from({ length: 22 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * 1200) / 22} y1="0" x2={600} y2="500" />
        ))}
        {Array.from({ length: 10 }).map((_, i) => {
          const y = 100 + i * 60;
          return <line key={`h${i}`} x1="0" y1={y} x2="1200" y2={y} />;
        })}
      </g>
      {/* Locked silhouette */}
      <g transform="translate(600 350)" stroke="hsl(0 0% 100%)" strokeWidth="6" fill="none" opacity="0.4">
        <rect x="-80" y="-50" width="160" height="120" rx="12" />
        <path d="M -40 -50 V -100 A 40 40 0 0 1 40 -100 V -50" />
      </g>
      <rect y="500" width="1200" height="200" fill="url(#cs-floor)" />
    </svg>
  );
}
