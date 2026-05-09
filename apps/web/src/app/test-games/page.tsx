'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@getx/ui';
import { useGames } from '@/hooks/use-games';

export default function TestGamesPage() {
  const { data: games, isLoading, error } = useGames();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl mb-6">Loading games...</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-error">Error loading games: {String(error)}</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-2">GETX Games</h1>
      <p className="text-muted-foreground mb-8">
        {games?.length ?? 0} games available. Powered by multi-game architecture.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games?.map((game) => (
          <Card key={game.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{game.name}</CardTitle>
                {game.isLaunched ? (
                  <Badge variant="default">Live</Badge>
                ) : (
                  <Badge variant="secondary">Coming Soon</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
              <div className="flex gap-4 text-sm">
                <span>{game.totalListings} listings</span>
                <span>{game.totalSellers} sellers</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
