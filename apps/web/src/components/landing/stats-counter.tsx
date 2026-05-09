'use client';

import { useGames } from '@/hooks/use-games';

export function StatsCounter() {
  const { data: games } = useGames();
  const totalListings = games?.reduce((sum, g) => sum + (g.totalListings || 0), 0) ?? 0;
  const totalSellers = games?.reduce((sum, g) => sum + (g.totalSellers || 0), 0) ?? 0;

  // Rating + countries are placeholder until real metrics ship in later prompts.
  const stats = [
    { label: 'Active Listings', value: `${totalListings}+`, color: 'text-primary' },
    { label: 'Verified Sellers', value: `${totalSellers}+`, color: 'text-accent' },
    { label: 'Average Rating', value: '4.9', color: 'text-success' },
    { label: 'Countries Served', value: '50+', color: 'text-info' },
  ];

  return (
    <section className="py-16 border-b">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`font-display text-4xl md:text-5xl font-bold mb-2 ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
