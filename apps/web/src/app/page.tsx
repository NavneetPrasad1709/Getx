import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/landing/hero-section';
import { GamesShowcase } from '@/components/landing/games-showcase';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ServicesPreview } from '@/components/landing/services-preview';
import { TrustSignals } from '@/components/landing/trust-signals';
import { StatsCounter } from '@/components/landing/stats-counter';
import { Testimonials } from '@/components/landing/testimonials';
import { ForSellers } from '@/components/landing/for-sellers';
import { FinalCTA } from '@/components/landing/final-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

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
    url: 'https://getx.gg',
    siteName: 'GETX',
    images: [
      {
        url: 'https://getx.gg/og-image.png',
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
    canonical: 'https://getx.gg',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <GamesShowcase />
        <HowItWorks />
        <ServicesPreview />
        <TrustSignals />
        <StatsCounter />
        <Testimonials />
        <ForSellers />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
