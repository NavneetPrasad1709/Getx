import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/* GetXMark — the X monogram. Use for favicon, app icon, watermarks.   */
/*                                                                    */
/* Construction: two crossing parallelogram "blades" with a small      */
/* spark accent at the top-right intersection. Arms at ~60° / ~45° so  */
/* the mark feels dynamic rather than symmetric (per design brief).    */
/* Default fill = currentColor → themes naturally. Pass `gradient` for */
/* the cyan-volt → cyan-ice signature treatment.                      */
/* ------------------------------------------------------------------ */

export interface GetXMarkProps extends React.SVGAttributes<SVGSVGElement> {
  /** Apply the signature cyan gradient. */
  gradient?: boolean;
  /** Add an animated glow halo (for hero placements only). */
  glow?: boolean;
  /** Width/height in px (square). Defaults to 32. */
  size?: number | string;
  /** Optional title for a11y. */
  title?: string;
}

const GetXMark = React.forwardRef<SVGSVGElement, GetXMarkProps>(
  ({ className, gradient = false, glow = false, size = 32, title, ...props }, ref) => {
    const gradientId = React.useId();
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={title ? 'img' : 'presentation'}
        aria-label={title}
        className={cn(glow && 'animate-logo-glow', className)}
        {...props}
      >
        {title ? <title>{title}</title> : null}
        {gradient ? (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="hsl(41 97% 54%)" />
              <stop offset="50%" stopColor="hsl(41 100% 60%)" />
              <stop offset="100%" stopColor="hsl(41 97% 54%)" />
            </linearGradient>
          </defs>
        ) : null}
        {/* Left blade — top-left to bottom-right, slight 60° pitch */}
        <path
          d="M10 6 L22 6 L54 58 L42 58 Z"
          fill={gradient ? `url(#${gradientId})` : 'currentColor'}
        />
        {/* Right blade — top-right to bottom-left, slight 45° pitch */}
        <path
          d="M54 6 L42 6 L10 58 L22 58 Z"
          fill={gradient ? `url(#${gradientId})` : 'currentColor'}
          opacity="0.92"
        />
        {/* Spark accent at top-right of crossing — the signature mark */}
        <path
          d="M40 22 L46 16 L48 22 Z"
          fill={gradient ? `url(#${gradientId})` : 'currentColor'}
          opacity="0.6"
        />
      </svg>
    );
  },
);
GetXMark.displayName = 'GetXMark';

/* ------------------------------------------------------------------ */
/* GetXLogo — full wordmark. "GET" in display font + the X mark.       */
/*                                                                    */
/* Renders as an inline-flex row so it sits cleanly in nav bars and    */
/* heroes. Use `size` to pick a preset; `gradient` to enable the cyan  */
/* signature on the X.                                                */
/* ------------------------------------------------------------------ */

export interface GetXLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  gradient?: boolean;
  glow?: boolean;
  /** Render without the wordmark — just the X mark inline (rare; prefer GetXMark). */
  markOnly?: boolean;
  /** Optional tagline rendered below — e.g. "Get gaming." */
  tagline?: string;
}

const sizeMap = {
  sm: { word: 'text-lg leading-none', mark: 18, gap: 'gap-1' },
  md: { word: 'text-2xl leading-none', mark: 26, gap: 'gap-1.5' },
  lg: { word: 'text-4xl leading-none', mark: 40, gap: 'gap-2' },
  xl: { word: 'text-6xl leading-none', mark: 64, gap: 'gap-3' },
} as const;

const GetXLogo = React.forwardRef<HTMLSpanElement, GetXLogoProps>(
  ({ className, size = 'md', gradient = false, glow = false, markOnly = false, tagline, ...props }, ref) => {
    const cfg = sizeMap[size];

    if (markOnly) {
      return (
        <span ref={ref} className={cn('inline-flex items-center', className)} {...props}>
          <GetXMark size={cfg.mark} gradient={gradient} glow={glow} title="GetX" />
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={cn('inline-flex flex-col', className)}
        aria-label="GetX"
        {...props}
      >
        <span className={cn('inline-flex items-center', cfg.gap)}>
          <span
            className={cn(
              'font-display font-bold tracking-tight',
              cfg.word,
              gradient && 'gradient-text-cyan',
            )}
          >
            GET
          </span>
          <GetXMark
            size={cfg.mark}
            gradient={gradient}
            glow={glow}
            title="X"
            className={gradient ? '' : 'text-foreground'}
          />
        </span>
        {tagline ? (
          <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {tagline}
          </span>
        ) : null}
      </span>
    );
  },
);
GetXLogo.displayName = 'GetXLogo';

export { GetXLogo, GetXMark };
