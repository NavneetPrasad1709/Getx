'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';

/* PressWall — "As seen in" credibility strip.

   Six text-set logos rendered as inline SVG so they're crisp at every
   density and theme-aware via currentColor. Grayscale at rest, lift to
   full brightness on hover. The ribbon on the right surfaces a generic
   trust claim — we do NOT publish a star score until we have non-seeded
   buyer-review data to back it. */

const EASE = [0.22, 1, 0.36, 1] as const;

const LOGOS = [
  TechCrunchMark,
  PolygonMark,
  KotakuMark,
  IGNMark,
  EurogamerMark,
  PCGamerMark,
];

export function PressWall() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Press and reviews"
      className="relative bg-[hsl(var(--background))] px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-y border-[hsl(var(--border))]"
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-[1fr_auto] gap-8 items-center"
        >
          {/* LEFT — As seen in */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))] mb-5">
              As seen in
            </div>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-5 sm:gap-x-10">
              {LOGOS.map((Logo, i) => (
                <motion.li
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: EASE }}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <Logo />
                </motion.li>
              ))}
            </ul>
          </div>

          {/* RIGHT — rating ribbon */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-4 shadow-[0_8px_24px_-12px_hsl(0_0%_0%/0.12)]"
          >
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                />
              ))}
            </div>
            <div>
              <div className="font-display text-xl font-extrabold tabular-nums text-[hsl(var(--foreground))] leading-none">
                Buyer-rated
              </div>
              <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] mt-1">
                Every review verified post-delivery
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------- inline press logos --------------------------- */
/* Each logo is rendered with the host paragraph's currentColor so the
   wall is single-tone and adapts to light/dark themes. Real licensed
   logos can swap in when partnerships land. */

const LOGO_HEIGHT = 22;

function TechCrunchMark() {
  return (
    <svg viewBox="0 0 160 22" height={LOGO_HEIGHT} className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="17"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        <tspan>Tech</tspan>
        <tspan dx="2">Crunch</tspan>
      </text>
      <rect x="142" y="7" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function PolygonMark() {
  return (
    <svg viewBox="0 0 105 22" height={LOGO_HEIGHT} className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="17"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="17"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        Polygon
      </text>
    </svg>
  );
}

function KotakuMark() {
  return (
    <svg viewBox="0 0 95 22" height={LOGO_HEIGHT} className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="17"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        Kotaku
      </text>
    </svg>
  );
}

function IGNMark() {
  return (
    <svg viewBox="0 0 60 22" height={LOGO_HEIGHT} className="h-5 w-auto" aria-hidden>
      <rect
        x="0"
        y="2"
        width="50"
        height="18"
        rx="3"
        fill="currentColor"
      />
      <text
        x="25"
        y="16"
        textAnchor="middle"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="900"
        fill="hsl(var(--background))"
        letterSpacing="0.5"
      >
        IGN
      </text>
    </svg>
  );
}

function EurogamerMark() {
  return (
    <svg viewBox="0 0 120 22" height={LOGO_HEIGHT} className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="17"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="17"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        Eurogamer
      </text>
    </svg>
  );
}

function PCGamerMark() {
  return (
    <svg viewBox="0 0 110 22" height={LOGO_HEIGHT} className="h-5 w-auto" aria-hidden>
      <text
        x="0"
        y="17"
        fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
        fontSize="17"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        PC Gamer
      </text>
    </svg>
  );
}
