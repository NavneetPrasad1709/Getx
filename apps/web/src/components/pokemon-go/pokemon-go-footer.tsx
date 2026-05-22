'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from '@getx/ui';
import {
  Twitter,
  MessageCircle,
  Instagram,
  Youtube,
  ShieldCheck,
  Zap,
  Wallet,
  ArrowUp,
  ArrowRight,
} from 'lucide-react';

/* PokemonGoFooter — themed footer for /games/pokemon-go.

   Two-column layout: trust-strip + newsletter on the left, brand + legal
   on the right. A tight controlled sticker strip at the very top spills
   from the dark section above. Pokémon-yellow ground, dark ink, no
   busy-ness. Legal disclaimer is condensed to one paragraph so it scans. */

const SOCIALS = [
  { label: 'X / Twitter', href: 'https://twitter.com/getx_gg', Icon: Twitter },
  { label: 'Discord', href: 'https://discord.gg/getx', Icon: MessageCircle },
  { label: 'YouTube', href: 'https://youtube.com/@getx-gg', Icon: Youtube },
  { label: 'Instagram', href: 'https://instagram.com/getx.live', Icon: Instagram },
];

const LEGAL_LINKS = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Refunds', href: '/refund' },
  { label: 'Help', href: '/help' },
];

const STICKER_PALETTE = [
  { c: '#FF1B1B' },
  { c: '#3B4CCA' },
  { c: '#10B981' },
  { c: '#FFCB05' },
  { c: '#7A5AF8' },
  { c: '#FF6B35' },
];

export function PokemonGoFooter() {
  return (
    <footer className="relative bg-[#FFCB05] text-[#0A0B1E]">
      <StickerStrip />

      <div className="container relative pt-14 sm:pt-18 md:pt-24 pb-10">
        {/* TOP — single trust strip across the full width */}
        <ul className="mx-auto max-w-3xl flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-6 gap-y-2 mb-10 md:mb-16 text-[12px] sm:text-[13px] font-semibold text-[#0A0B1E]/85">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Escrow protected
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            5-min delivery
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4" />
            UPI · cards · netbanking
          </li>
        </ul>

        {/* CENTER — brand wordmark with shadow lockup */}
        <div className="text-center mb-10 md:mb-14">
          <div
            className="font-display text-[clamp(3.5rem,12vw,8rem)] font-extrabold tracking-[-0.04em] text-[#0A0B1E] leading-none"
            style={{ textShadow: '4px 4px 0 rgba(10,11,30,0.12)' }}
          >
            GETX
          </div>
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#0A0B1E]/65">
            <span className="h-px w-8 bg-[#0A0B1E]/30" />
            Pokémon GO marketplace · India
            <span className="h-px w-8 bg-[#0A0B1E]/30" />
          </div>
        </div>

        {/* TWO-COL — newsletter + socials | legal + region */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 max-w-4xl mx-auto pb-8 md:pb-10">
          {/* LEFT — newsletter + socials */}
          <div>
            <div className="font-display text-xl font-extrabold mb-1.5">
              Get drop alerts.
            </div>
            <p className="text-[13px] text-[#0A0B1E]/65 mb-4 max-w-xs">
              When a hundo or shiny drops, we&apos;ll ping you. No spam.
            </p>

            <form
              className="flex items-center gap-2 rounded-full bg-white ring-2 ring-[#0A0B1E] pr-1 pl-4 py-1 max-w-sm focus-within:ring-[3px]"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="you@trainer.gg"
                aria-label="Email address for drop alerts"
                className="flex-1 bg-transparent outline-none text-[14px] text-[#0A0B1E] placeholder:text-[#0A0B1E]/40 min-w-0"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#0A0B1E] text-white text-[12px] font-bold hover:bg-[#1F2138] transition-colors shrink-0"
              >
                Subscribe
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 grid place-items-center rounded-full bg-[#0A0B1E] text-white hover:bg-[#1F2138] hover:-translate-y-0.5 transition-all"
                >
                  <s.Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT — explore + region */}
          <div className="md:text-right">
            <div className="font-display text-xl font-extrabold mb-1.5">
              Explore GETX.
            </div>
            <p className="text-[13px] text-[#0A0B1E]/65 mb-4 max-w-xs md:ml-auto">
              All games, sellers, and orders in one place.
            </p>

            <ul className="space-y-2 mb-6">
              {[
                { l: 'Home', h: '/' },
                { l: 'All games', h: '/games' },
                { l: 'Become a seller', h: '/sellers/program' },
                { l: 'How it works', h: '/how-it-works' },
              ].map((x) => (
                <li key={x.h}>
                  <Link
                    href={x.h}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0A0B1E] hover:text-[#0A0B1E]/70 transition-colors"
                  >
                    {x.l}
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#0A0B1E] text-white text-[12px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <span className="font-semibold">India</span>
              <span className="text-white/55">·</span>
              <span className="text-white/75">INR · UPI</span>
            </div>
          </div>
        </div>

        {/* BOTTOM — legal */}
        <div className="border-t border-[#0A0B1E]/15 pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] font-semibold text-[#0A0B1E]">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="hover:text-[#0A0B1E]/65 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-[#0A0B1E]/70">
              © 2026 Deccanport Technologies Pvt Ltd
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-[#0A0B1E]/55 max-w-3xl">
            <strong>Disclaimer:</strong> Pokémon GO is © Niantic, Inc. and ©1995–2026
            Nintendo / Creatures Inc. / GAME FREAK inc. GETX is an independent
            secondary marketplace and is not affiliated with, endorsed by, or
            sponsored by Niantic, Nintendo, or The Pokémon Company. Trademarks
            used solely to identify the games for which services are listed.
          </p>
        </div>
      </div>

      <ScrollTopButton />
    </footer>
  );
}

/* --------------------------- helpers --------------------------- */

/* Sticker strip — evenly-distributed stickers hanging above the yellow
   band. Mobile shows 5, desktop shows 9, so they don't overlap on narrow
   viewports. Decorative — pointer-events-none. */
function StickerStrip() {
  return (
    <div
      aria-hidden
      className="relative -mt-8 sm:-mt-10 md:-mt-14 h-16 sm:h-20 md:h-24 overflow-hidden pointer-events-none"
    >
      <div className="container relative h-full">
        <div className="absolute inset-x-0 bottom-0 flex justify-between items-end gap-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const p = STICKER_PALETTE[i % STICKER_PALETTE.length];
            const rotate = i % 2 === 0 ? 10 : -10;
            // Hide stickers 2, 4, 5, 7 on mobile — keeps 5 evenly spread.
            const hiddenOnMobile = [2, 4, 5, 7].includes(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, y: 24 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.05,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                style={{
                  transform: `rotate(${rotate}deg)`,
                  filter: 'drop-shadow(0 6px 12px rgba(10,11,30,0.22))',
                }}
                className={`relative grid place-items-center w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 ${hiddenOnMobile ? 'hidden sm:grid' : ''}`}
              >
                <div
                  className="absolute inset-0 rounded-full ring-[3px] ring-[#0A0B1E]"
                  style={{
                    background: `linear-gradient(180deg, ${p.c} 0%, ${p.c} 48%, #FFFFFF 52%, #FFFFFF 100%)`,
                  }}
                />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#0A0B1E]" />
                <div className="relative h-[28%] w-[28%] rounded-full ring-[3px] ring-[#0A0B1E] bg-white" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScrollTopButton() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="hidden md:inline-flex absolute right-6 bottom-8 h-12 w-12 items-center justify-center rounded-full bg-white text-[#0A0B1E] ring-2 ring-[#0A0B1E] hover:bg-white/95 hover:-translate-y-0.5 transition-all shadow-[0_8px_20px_rgba(10,11,30,0.25)]"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
