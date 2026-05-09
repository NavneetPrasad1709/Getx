import Link from 'next/link';
import { Button, Card, CardContent } from '@getx/ui';

const services = [
  {
    name: 'Accounts',
    description: 'Pre-leveled trainer accounts with shinies, legendaries, and more',
    href: '/games/pokemon-go/accounts',
    badge: 'Most Popular',
  },
  {
    name: 'Top Ups',
    description: 'Fast PokéCoins delivery. Get the currency, skip the wait.',
    href: '/games/pokemon-go/top-ups',
  },
  {
    name: 'Items',
    description: 'Pokeballs, berries, potions and curated bundles',
    href: '/games/pokemon-go/items',
  },
  {
    name: 'Boosting',
    description: 'Level up, raid, hunt shinies. Expert boosters bid for your job.',
    href: '/games/pokemon-go/boosting',
    badge: 'Reverse Marketplace',
  },
];

export function ServicesPreview() {
  return (
    <section className="py-20 border-b">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Everything in one marketplace
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse listings or get personalized offers. The choice is yours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {services.map((service) => (
            <Link key={service.name} href={service.href}>
              <Card className="h-full hover:border-primary/50 transition-colors group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-display text-sm font-semibold text-primary">
                        {service.name.slice(0, 1)}
                      </span>
                    </div>
                    {service.badge && (
                      <span className="text-xs bg-accent/10 text-accent-foreground px-2 py-1 rounded-full">
                        {service.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  <span className="text-sm text-primary font-medium group-hover:underline">
                    Browse →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/games/pokemon-go">
            <Button variant="outline" size="lg">
              View all Pokemon GO services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
