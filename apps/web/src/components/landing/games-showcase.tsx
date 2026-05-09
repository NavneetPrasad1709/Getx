'use client';

import Link from 'next/link';
import { Badge, Card, CardContent, Skeleton } from '@getx/ui';
import { useGames, type Game } from '@/hooks/use-games';

export function GamesShowcase() {
  const { data: games, isLoading } = useGames();

  return (
    <section className="py-20 border-b">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Choose your game</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            More games launching every month. Pokemon GO live now, Roblox coming soon.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {isLoading ? (
            <>
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </>
          ) : (
            <>
              {games?.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}

              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <span className="text-2xl">+</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">More Games Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Vote for your favorite at our community Discord
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function GameCard({ game }: { game: Game }) {
  const isLive = game.isLaunched;
  const href = isLive ? `/games/${game.slug}` : '#';

  return (
    <Link href={href} className={isLive ? '' : 'pointer-events-none'}>
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-display text-xl font-bold text-primary">
                {game.shortName ?? game.name.slice(0, 2)}
              </span>
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
          <p className="text-sm text-muted-foreground mb-4">{game.description}</p>

          {isLive && (
            <div className="flex items-center justify-between text-sm pt-4 border-t">
              <span className="text-muted-foreground">{game.totalListings} listings</span>
              <span className="text-muted-foreground">{game.totalSellers} sellers</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
