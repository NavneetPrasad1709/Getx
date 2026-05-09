'use client';

import Link from 'next/link';
import { Badge, Card, CardContent, Skeleton } from '@getx/ui';
import { useGames } from '@/hooks/use-games';

export function GamesGrid() {
  const { data: games, isLoading } = useGames();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {games?.map((game) => {
        const isLive = game.isLaunched;
        const href = isLive ? `/games/${game.slug}` : '#';

        return (
          <Link
            key={game.id}
            href={href}
            className={isLive ? '' : 'pointer-events-none'}
            aria-disabled={!isLive}
          >
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl font-display font-bold">
                    {game.name.charAt(0)}
                  </div>
                  {isLive ? (
                    <Badge variant="default" className="gap-1">
                      <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Coming Soon</Badge>
                  )}
                </div>

                <h3 className="font-display text-2xl font-bold mb-2">{game.name}</h3>
                {game.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {game.description}
                  </p>
                )}

                {isLive && (
                  <div className="flex items-center justify-between text-sm pt-4 border-t">
                    <span className="text-muted-foreground">📦 {game.totalListings} listings</span>
                    <span className="text-muted-foreground">👤 {game.totalSellers} sellers</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-2xl">
            ?
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">More Games Soon</h3>
          <p className="text-sm text-muted-foreground">Vote for your favorite game on Discord</p>
        </CardContent>
      </Card>
    </div>
  );
}
