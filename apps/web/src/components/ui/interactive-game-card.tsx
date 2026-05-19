'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, type LucideIcon } from 'lucide-react';
import { cn } from '@getx/ui';

/* InteractiveGameCard — split-panel game card.
 *
 * Image area on top (full color, no overlay), solid text panel below.
 * Each layer does one job: image showcases the game, panel carries the
 * copy. Killed the "full-bleed image + dark gradient + glass tags
 * floating in space" pattern — that's the AI-tile-generator look that
 * makes every dark marketplace landing feel the same.
 *
 * Tilt + image parallax kept. Pointer-tracked glow effects removed
 * (user found them irritating). Hover = subtle ring + lift + image
 * zoom only.
 */

export interface InteractiveGameCardProps {
  href: string;
  imageUrl: string;
  title: string;
  status: 'live' | 'soon';
  tag?: string;
  description?: string;
  metaPrimary?: string;
  metaSecondary?: string;
  Icon?: LucideIcon;
  glowHue?: number;
  glowSpread?: number;
  /** Aspect ratio class. Pass `false` to disable aspect entirely and
      let the parent control height (e.g. via h-full + a fixed wrapper). */
  aspect?: string | false;
  className?: string;
  priority?: boolean;
  sizes?: string;
  comingSoon?: boolean;
}

export function InteractiveGameCard({
  href,
  imageUrl,
  title,
  status,
  tag,
  description,
  metaPrimary,
  metaSecondary,
  Icon,
  aspect,
  className,
  priority,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  comingSoon = false,
}: InteractiveGameCardProps) {
  const cardRef = React.useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0, scale: 1, hovering: false });

  const handleMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    /* Subtle tilt — ±4° max. Stronger felt gimmicky, like the
       21st.dev demo. This dial says "alive" without saying "look at
       me look at me." */
    const rx = ((y / rect.height) - 0.5) * -4;
    const ry = ((x / rect.width) - 0.5) * 4;

    setTilt((prev) =>
      prev.hovering && prev.rx === rx && prev.ry === ry
        ? prev
        : { rx, ry, scale: 1.01, hovering: true },
    );
  };

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0, scale: 1, hovering: false });
  };

  const aspectClass =
    aspect === false
      ? ''
      : (aspect ?? (status === 'live' ? 'aspect-[16/9]' : 'aspect-[3/4]'));

  return (
    <Link
      ref={cardRef}
      href={href}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{
        transform: `perspective(1400px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${tilt.scale},${tilt.scale},${tilt.scale})`,
        transition: tilt.hovering
          ? 'transform 0.12s ease-out'
          : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'bg-[#0c0d12]',
        'ring-1 ring-white/8 hover:ring-white/15',
        'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_28px_60px_-22px_rgba(0,0,0,0.8)]',
        '[transform-style:preserve-3d]',
        'transition-shadow duration-500',
        aspectClass,
        className,
      )}
    >
      {/* IMAGE AREA — top portion, full color, no overlay. The only
          thing floating on it is the status chip in the top-left. */}
      <div className="relative flex-1 overflow-hidden bg-[#050505]">
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
          <Image
            src={imageUrl}
            alt={title}
            fill
            priority={priority}
            sizes={sizes}
            className="object-cover"
          />
        </div>

        {/* Status chip — solid dark pill (no glass) so it reads on any
            background without backdrop-filter performance cost. */}
        {tag ? (
          <div className="absolute top-3 left-3 z-10">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
                'bg-black/85 ring-1 ring-white/12',
                'text-[10px] uppercase tracking-[0.22em] font-mono font-semibold text-white',
                'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)]',
              )}
            >
              {status === 'live' ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                </span>
              ) : Icon ? (
                <Icon className="h-3 w-3 text-white/85" strokeWidth={2.5} />
              ) : null}
              {tag}
            </span>
          </div>
        ) : null}

        {/* Coming-soon corner stamp — top-right, mirrors the status chip
            position so the card has visual symmetry. */}
        {comingSoon ? (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
                'bg-primary/95 ring-1 ring-white/15',
                'text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-primary-foreground',
                'shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.45)]',
              )}
            >
              <Lock className="h-2.5 w-2.5" strokeWidth={3} />
              Coming Soon
            </span>
          </div>
        ) : null}
      </div>

      {/* TEXT PANEL — solid surface, never overlays the image. Fixed
          height across every card variant so all panel-bottoms align
          and image areas match in proportion. */}
      <div
        className={cn(
          'relative shrink-0 px-4 pt-3.5 pb-4 md:px-5 md:pt-4 md:pb-5',
          'h-[110px] md:h-[118px] lg:h-[124px]',
          'flex flex-col justify-between',
          'bg-gradient-to-b from-[#0e1016] to-[#08090d]',
          'border-t border-white/8',
        )}
      >
        {/* Subtle top-edge highlight — implies the panel is a separate
            material from the image area. */}
        <div
          aria-hidden
          className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        <h3
          className={cn(
            'font-display font-bold uppercase leading-[0.9] tracking-[-0.02em] text-white',
            status === 'live'
              ? 'text-[clamp(1.375rem,2.4vw,2rem)]'
              : 'text-[clamp(1rem,1.6vw,1.375rem)]',
          )}
        >
          {title}
        </h3>

        {description && !comingSoon ? (
          <p className="mt-1.5 text-[12.5px] md:text-[13px] text-white/85 leading-snug font-light line-clamp-2">
            {description}
          </p>
        ) : null}

        {/* Stats / CTA row */}
        {(metaPrimary || metaSecondary || comingSoon) ? (
          <div className="mt-3 pt-3 border-t border-white/8 flex items-center gap-3 flex-wrap">
            {metaPrimary ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                <span className="text-white font-bold tabular-nums">{metaPrimary}</span>
              </span>
            ) : null}
            {metaPrimary && metaSecondary ? (
              <span aria-hidden className="h-3 w-px bg-white/15" />
            ) : null}
            {metaSecondary ? (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/95 font-bold tabular-nums">
                {metaSecondary}
              </span>
            ) : null}
            {comingSoon && !metaPrimary ? (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/80">
                Join waitlist
              </span>
            ) : null}
            <span
              className="
                ml-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em]
                text-white/75 group-hover:text-primary
                transition-colors duration-300
              "
            >
              {comingSoon ? 'Notify me' : 'Enter'}
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
