'use client';

import Link from 'next/link';
import { Badge, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useGame } from '@/hooks/use-games';

interface BoostingService {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  estimatedTime?: string;
}

interface ReverseTab {
  type?: string;
  subServices?: BoostingService[];
}

interface FieldsConfig {
  tabs?: ReverseTab[];
}

interface GamePayload {
  fieldsConfig?: FieldsConfig;
}

export default function BoostingHubPage() {
  const { data, isLoading } = useGame('pokemon-go');
  const game = data as GamePayload | undefined;

  const boostingTab = game?.fieldsConfig?.tabs?.find((t) => t.type === 'REVERSE');
  const services = boostingTab?.subServices ?? [];

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
            <Link href="/games/pokemon-go" className="hover:text-foreground">
              Pokemon GO
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Boosting</span>
          </nav>

          <Badge variant="secondary" className="mb-3">
            Reverse Marketplace
          </Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Pokemon GO Boosting</h1>
          <p className="text-muted-foreground max-w-2xl mb-6">
            Tell us what you need. Expert boosters bid for your job. You choose the best offer based
            on price, delivery time, and seller rating.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Step number="1" title="Post your need" desc="Pick a service, fill the form. Free." />
            <Step
              number="2"
              title="Get offers"
              desc="Sellers compete. Offers usually arrive in minutes."
            />
            <Step
              number="3"
              title="Choose & relax"
              desc="Pick the best offer. Money in escrow until delivery."
            />
          </div>
        </div>
      </section>

      <main className="flex-1 container py-10">
        <h2 className="font-display text-2xl font-bold mb-2">Choose your service</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {services.length} specialized boosting services. Each gets matched to expert sellers.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/games/pokemon-go/boosting/${service.slug}`}
                className="block group"
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-display text-lg font-bold text-primary">
                        {service.icon ?? service.name.charAt(0)}
                      </div>
                      <h3 className="font-display text-lg font-bold">{service.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 flex-1">
                      {service.description}
                    </p>
                    {service.estimatedTime && (
                      <p className="text-xs text-muted-foreground mb-3">
                        ⏱️ {service.estimatedTime}
                      </p>
                    )}
                    <span className="text-sm font-medium text-primary group-hover:underline">
                      Get offers →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <Link href="/requests" className="text-sm font-medium text-primary hover:underline">
              Browse open requests from other buyers →
            </Link>
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {number}
        </span>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground pl-9">{desc}</p>
    </div>
  );
}
