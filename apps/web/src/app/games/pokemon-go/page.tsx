'use client';

import Link from 'next/link';
import { Badge, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useGame } from '@/hooks/use-games';

interface GameSummary {
  name?: string;
  description?: string | null;
  totalListings?: number;
  totalSellers?: number;
}

const TABS = [
  {
    href: '/games/pokemon-go/accounts',
    monogram: 'A',
    title: 'Accounts',
    description: 'Pre-leveled trainers with shinies and legendaries',
    cta: 'Browse accounts',
  },
  {
    href: '/games/pokemon-go/top-ups',
    monogram: 'T',
    title: 'Top Ups',
    description: 'PokéCoins delivered fast to your account',
    cta: 'Browse top ups',
  },
  {
    href: '/games/pokemon-go/items',
    monogram: 'I',
    title: 'Items',
    description: 'Pokeballs, berries, potions and bundles',
    cta: 'Browse items',
  },
  {
    href: '/games/pokemon-go/boosting',
    monogram: 'B',
    title: 'Boosting',
    description: 'Sellers bid for your job — choose the best',
    cta: 'Get offers',
    badge: 'Reverse Market',
  },
];

export default function PokemonGoHubPage() {
  const { data, isLoading } = useGame('pokemon-go');
  const game = data as GameSummary | undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="border-b bg-muted/20">
        <div className="container py-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/games" className="hover:text-foreground">
              Games
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Pokemon GO</span>
          </nav>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                {game?.name ?? 'Pokemon GO'}
              </h1>
              {game?.description && (
                <p className="text-muted-foreground max-w-2xl mb-4">{game.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="default" className="gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                  Live
                </Badge>
                <span className="text-muted-foreground">
                  📦 {game?.totalListings ?? 0} listings
                </span>
                <span className="text-muted-foreground">👤 {game?.totalSellers ?? 0} sellers</span>
              </div>
            </>
          )}
        </div>
      </section>

      <main className="flex-1 container py-10">
        <h2 className="font-display text-2xl font-bold mb-6">Choose a category</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className="block group">
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center font-display text-2xl font-bold text-primary">
                      {tab.monogram}
                    </div>
                    {tab.badge && (
                      <Badge variant="secondary" className="text-[10px]">
                        {tab.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{tab.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{tab.description}</p>
                  <span className="text-sm font-medium text-primary group-hover:underline">
                    {tab.cta} →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
