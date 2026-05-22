import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import ReactDOM from 'react-dom';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/landing/hero-section';
import { PartnerTrustBand } from '@/components/landing/partner-trust-band';
import { LandingFooter } from '@/components/landing/landing-footer';

/* Below-fold landing sections are lazy-loaded so the initial JS chunk
   stays lean. They still SSR (ssr:true is the default) — buyer sees
   the static HTML immediately; the hydration JS streams in as the user
   scrolls. Each section pulls framer-motion which makes it a worthwhile
   split point. */
const GamesShowcase = dynamic(() =>
  import('@/components/landing/games-showcase').then((m) => m.GamesShowcase),
);
const HowItWorksLight = dynamic(() =>
  import('@/components/landing/how-it-works-light').then((m) => m.HowItWorksLight),
);
const ForSellers = dynamic(() =>
  import('@/components/landing/for-sellers').then((m) => m.ForSellers),
);
const UspCards = dynamic(() =>
  import('@/components/landing/usp-cards').then((m) => m.UspCards),
);
const FinalCTA = dynamic(() =>
  import('@/components/landing/final-cta').then((m) => m.FinalCTA),
);

export const metadata: Metadata = {
  title: 'GETX — The Premium Gaming Marketplace',
  description:
    'Buy & sell game accounts, top-ups, items, and boosting services. Verified sellers, secure escrow, instant delivery. Pokemon GO live now.',
  keywords: [
    'gaming marketplace',
    'pokemon go accounts',
    'pokecoins',
    'boosting services',
    'game items',
  ],
  openGraph: {
    title: 'GETX — Get X. Get gaming.',
    description: 'The premium marketplace for gaming services.',
    url: 'https://getx.live',
    siteName: 'GETX',
    images: [
      {
        url: 'https://getx.live/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GETX - Premium Gaming Marketplace',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GETX — Get X. Get gaming.',
    description: 'The premium marketplace for gaming services.',
  },
  alternates: {
    canonical: 'https://getx.live',
  },
};

export default function HomePage() {
  /* LCP optimisation — preload the hero background at the exact
     resolution next/image will request for mobile + desktop. Lighthouse
     flagged the hero as the LCP element with priorityHinted=false;
     ReactDOM.preload injects a <link rel=preload as=image fetchpriority=
     high imageSrcSet=...> into <head> before React even mounts the
     image, so the browser starts fetching during HTML parsing instead
     of after JS hydration. The src matches /games/pokemon-go/
     pokemongo-game.webp going through next/image. */
  ReactDOM.preload(
    '/_next/image?url=%2Fgames%2Fpokemon-go%2Fpokemongo-game.webp&w=640&q=75',
    {
      as: 'image',
      fetchPriority: 'high',
      imageSrcSet:
        '/_next/image?url=%2Fgames%2Fpokemon-go%2Fpokemongo-game.webp&w=640&q=75 640w, ' +
        '/_next/image?url=%2Fgames%2Fpokemon-go%2Fpokemongo-game.webp&w=750&q=75 750w, ' +
        '/_next/image?url=%2Fgames%2Fpokemon-go%2Fpokemongo-game.webp&w=1080&q=75 1080w, ' +
        '/_next/image?url=%2Fgames%2Fpokemon-go%2Fpokemongo-game.webp&w=1920&q=75 1920w',
      imageSizes: '100vw',
    },
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Theme-aware gradient backdrop — two layers, one shows per mode
          via Tailwind's dark: variant. Both anchor a soft primary-blue
          radial at top-center; the underlying color shifts. */}

      {/* Light-mode backdrop — soft white with subtle blue bloom */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 block dark:hidden"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--primary) / 0.10), transparent 65%), linear-gradient(180deg, hsl(220 20% 99%) 0%, hsl(220 18% 96%) 100%)',
        }}
      />

      {/* Dark-mode backdrop — deep near-black with primary bloom */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 hidden dark:block"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--primary) / 0.14), transparent 65%), linear-gradient(180deg, hsl(222 47% 5%) 0%, hsl(222 47% 3%) 100%)',
        }}
      />

      <Header />
      <main id="main" className="relative flex-1">
        {/* Continuous dotted bg — sits above the gradient, below content.
            Uses --foreground token so dots invert with theme: dark
            dots on light bg, light dots on dark bg. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <HeroSection />
        <PartnerTrustBand />
        <GamesShowcase />
        <HowItWorksLight />
        <ForSellers />
        <UspCards />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
