'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, type LucideIcon } from 'lucide-react';

/* UspCard — chunky pastel promise card.
 *
 * Modelled after the Eldorado "Money-Back / 24-7 Support" pattern: soft
 * pastel surface, dark editorial type, illustrated icon "seal" in a
 * darker accent, and a small pill CTA. These are USP cards — use them
 * strategically across the product wherever the user needs reassurance
 * (landing, product detail sidebar, checkout, empty states).
 *
 * The pastel surface stays the same in both light and dark themes — it
 * contrasts naturally with either page background and the inner text is
 * always near-black so legibility is constant.
 */

export type UspTheme = 'cream' | 'mint' | 'sky' | 'lilac' | 'peach';

interface ThemeTokens {
  surface: string;
  iconBg: string;
  iconText: string;
  iconRing: string;
  title: string;
  body: string;
  ctaBg: string;
  ctaText: string;
  ctaShadow: string;
  watermark: string;
}

const THEMES: Record<UspTheme, ThemeTokens> = {
  cream: {
    surface: 'bg-[#FCEBCB]',
    iconBg: 'bg-[#FCAF17]',
    iconText: 'text-[#2A1E08]',
    iconRing: 'ring-[#2A1E08]/15',
    title: 'text-[#2A1E08]',
    body: 'text-[#2A1E08]/75',
    ctaBg: 'bg-[#FCAF17] hover:bg-[#FFB82E]',
    ctaText: 'text-[#2A1E08]',
    ctaShadow: 'shadow-[0_5px_14px_-2px_rgb(0_0_0_/_0.18)]',
    watermark: 'text-[#2A1E08]/[0.06]',
  },
  mint: {
    surface: 'bg-[#C5E8AA]',
    iconBg: 'bg-[#7AB04A]',
    iconText: 'text-[#0F1F0A]',
    iconRing: 'ring-[#0F1F0A]/15',
    title: 'text-[#102008]',
    body: 'text-[#102008]/75',
    ctaBg: 'bg-[#FCAF17] hover:bg-[#FFB82E]',
    ctaText: 'text-[#2A1E08]',
    ctaShadow: 'shadow-[0_5px_14px_-2px_rgb(0_0_0_/_0.18)]',
    watermark: 'text-[#102008]/[0.06]',
  },
  sky: {
    surface: 'bg-[#C8DCEC]',
    iconBg: 'bg-[#3A82C4]',
    iconText: 'text-white',
    iconRing: 'ring-[#0B1830]/15',
    title: 'text-[#0B1830]',
    body: 'text-[#0B1830]/75',
    ctaBg: 'bg-[#0B1830] hover:bg-[#15264A]',
    ctaText: 'text-white',
    ctaShadow: 'shadow-[0_5px_14px_-2px_rgb(0_0_0_/_0.25)]',
    watermark: 'text-[#0B1830]/[0.06]',
  },
  lilac: {
    surface: 'bg-[#DCC8EC]',
    iconBg: 'bg-[#8A4FC4]',
    iconText: 'text-white',
    iconRing: 'ring-[#1F0E36]/15',
    title: 'text-[#1F0E36]',
    body: 'text-[#1F0E36]/75',
    ctaBg: 'bg-[#1F0E36] hover:bg-[#2F1850]',
    ctaText: 'text-white',
    ctaShadow: 'shadow-[0_5px_14px_-2px_rgb(0_0_0_/_0.25)]',
    watermark: 'text-[#1F0E36]/[0.06]',
  },
  peach: {
    surface: 'bg-[#FCD6C2]',
    iconBg: 'bg-[#F26E3B]',
    iconText: 'text-white',
    iconRing: 'ring-[#2C0F03]/15',
    title: 'text-[#2C0F03]',
    body: 'text-[#2C0F03]/75',
    ctaBg: 'bg-[#2C0F03] hover:bg-[#451808]',
    ctaText: 'text-white',
    ctaShadow: 'shadow-[0_5px_14px_-2px_rgb(0_0_0_/_0.25)]',
    watermark: 'text-[#2C0F03]/[0.06]',
  },
};

export interface UspCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  theme: UspTheme;
  /* Optional huge watermark glyph (number / short word) painted in the
     corner, like "01" or "24/7" — adds the editorial illustrated feel. */
  watermark?: string;
  /* Pass index to stagger entry animations when used in a grid */
  index?: number;
  /* Optional explicit aspect ratio — defaults to natural sizing */
  className?: string;
}

export function UspCard({
  icon: Icon,
  title,
  body,
  ctaLabel,
  ctaHref,
  theme,
  watermark,
  index = 0,
  className = '',
}: UspCardProps) {
  const reduce = useReducedMotion();
  const t = THEMES[theme];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: 0.06 * index, ease: [0.22, 1, 0.36, 1] }}
      className={`
        relative overflow-hidden rounded-[28px]
        ${t.surface}
        p-6 sm:p-7
        shadow-[0_10px_28px_-14px_rgb(0_0_0_/_0.25)]
        ring-1 ring-black/[0.04]
        ${className}
      `}
    >
      {/* WATERMARK — giant editorial number/word in the top-right corner.
          Anchors the card as a "promise" plate. */}
      {watermark ? (
        <span
          aria-hidden
          className={`
            pointer-events-none select-none
            absolute -top-2 -right-3
            font-display font-black uppercase
            tracking-[-0.06em] leading-none
            text-[clamp(5rem,11vw,7.5rem)]
            ${t.watermark}
          `}
        >
          {watermark}
        </span>
      ) : null}

      {/* ICON SEAL — chunky 3D button look with inner highlight + shadow */}
      <div
        className={`
          relative inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center
          rounded-2xl
          ${t.iconBg} ${t.iconText}
          ring-1 ${t.iconRing}
          shadow-[0_8px_20px_-6px_rgb(0_0_0_/_0.30),inset_0_-4px_0_rgb(0_0_0_/_0.10),inset_0_1.5px_0_rgb(255_255_255_/_0.45)]
          mb-5 sm:mb-6
        `}
      >
        <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.25} />
      </div>

      {/* Title */}
      <h3
        className={`
          font-display font-extrabold leading-tight tracking-[-0.015em]
          text-[clamp(1.15rem,2.4vw,1.4rem)]
          ${t.title}
          mb-2
        `}
      >
        {title}
      </h3>

      {/* Body */}
      <p className={`text-[13.5px] sm:text-[14px] leading-relaxed ${t.body} mb-5 sm:mb-6 max-w-[34ch]`}>
        {body}
      </p>

      {/* CTA pill */}
      <Link
        href={ctaHref}
        className={`
          group inline-flex items-center gap-1.5
          h-10 px-5 rounded-full
          ${t.ctaBg} ${t.ctaText}
          text-[13px] font-bold tracking-tight
          ${t.ctaShadow}
          transition-colors duration-150
        `}
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
