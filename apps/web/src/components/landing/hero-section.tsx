'use client';

import Link from 'next/link';
import { Button } from '@getx/ui';
import { useGames } from '@/hooks/use-games';

export function HeroSection() {
  const { data: games } = useGames();
  const totalListings = games?.reduce((sum, g) => sum + (g.totalListings || 0), 0) ?? 0;
  const totalSellers = games?.reduce((sum, g) => sum + (g.totalSellers || 0), 0) ?? 0;

  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

      <div className="container relative py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-surface text-xs font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Trusted by {totalSellers}+ verified sellers</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Get X.{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Get gaming.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The premium marketplace for game accounts, top-ups, items, and expert boosting services.
            Verified sellers. Secure escrow. Instant delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/games">
              <Button size="lg" className="w-full sm:w-auto">
                Browse Marketplace
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Get Started Free
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{totalListings}+</span>
              <span>active listings</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">4.9</span>
              <span>average rating</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">24/7</span>
              <span>support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
