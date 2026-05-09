import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { GamesGrid } from '@/components/games/games-grid';

export const metadata: Metadata = {
  title: 'All Games',
  description: 'Browse all games on GETX. Pokemon GO live now, more games coming soon.',
};

export default function GamesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="border-b bg-muted/30">
        <div className="container py-12">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-muted-foreground mb-2"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Games</span>
          </nav>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">All Games</h1>
          <p className="text-muted-foreground max-w-2xl">
            Choose your game and start trading. More games launching every month.
          </p>
        </div>
      </section>

      <main className="container py-12 flex-1">
        <GamesGrid />
      </main>

      <LandingFooter />
    </div>
  );
}
