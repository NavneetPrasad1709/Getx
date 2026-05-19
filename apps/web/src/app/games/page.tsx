import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { GamesGrid } from '@/components/games/games-grid';

export const metadata: Metadata = {
  title: 'All Games',
  description: 'Browse every game on GETX. Pokémon GO live, more coming each month.',
};

export default function GamesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,hsl(var(--primary)/0.14),transparent_70%)]" />
        <div className="container relative py-4 md:py-6">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground mb-2"
          >
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span aria-hidden className="text-muted-foreground/50">›</span>
            <span className="text-foreground">Games</span>
          </nav>

          <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary mb-1.5 font-bold">
            The catalog
          </div>
          <h1 className="font-display text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold tracking-tight leading-[1] text-foreground">
            Every game · <span className="text-primary">one marketplace</span>
          </h1>
          <p className="mt-1.5 text-[12.5px] md:text-[13px] text-muted-foreground leading-relaxed">
            Pokémon GO is live. The rest launch on community vote.
          </p>
        </div>
      </section>

      <main className="container pb-12 md:pb-16 flex-1">
        <GamesGrid />
      </main>

      <LandingFooter />
    </div>
  );
}
