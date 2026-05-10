'use client';

import Link from 'next/link';
import { Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { CustomRequestButton } from '@/components/custom-request/custom-request-button';

// Pokemon GO is the only launched game today (memory P5: roblox isActive=false).
// When more games launch, swap this for a game picker step.
const DEFAULT_GAME_SLUG = 'pokemon-go';

const tabs = [
  {
    tabType: 'ACCOUNTS' as const,
    title: 'Accounts',
    body: 'Looking for a specific level, region, team, or shiny count? Post the spec and let sellers come to you.',
  },
  {
    tabType: 'TOP_UPS' as const,
    title: 'Top-ups',
    body: 'Need a specific coin amount or bundle? Set your budget, sellers bid.',
  },
  {
    tabType: 'ITEMS' as const,
    title: 'Items',
    body: 'Specific items, quantities, or rarities you can’t find on the marketplace? Post a request.',
  },
  {
    tabType: 'BOOSTING' as const,
    title: 'Boosting service',
    body: 'Level-ups, raids, shiny hunts, event grinds. Pick a service or describe your own.',
  },
];

export default function NewRequestPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              Post a custom request
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Don&apos;t see what you need on the marketplace? Tell sellers exactly what you&apos;re
              after. They&apos;ll bid with prices and delivery times — you pick the offer that fits.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">Pick a category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tabs.map((t) => (
                <Card key={t.tabType}>
                  <CardContent className="p-6">
                    <h3 className="font-display text-lg font-bold mb-2">{t.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t.body}</p>
                    <CustomRequestButton
                      gameSlug={DEFAULT_GAME_SLUG}
                      tabType={t.tabType}
                      variant="default"
                    >
                      Post a {t.title.toLowerCase()} request
                    </CustomRequestButton>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-3xl">
            <h2 className="font-display text-xl md:text-2xl font-bold mb-3">How it works</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                  1
                </span>
                <span>Describe what you need — title, attributes, photos, budget range.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                  2
                </span>
                <span>
                  Sellers see your request and bid with their offer (price + delivery time).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                  3
                </span>
                <span>You compare offers, accept the one that fits, and pay through escrow.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                  4
                </span>
                <span>
                  Seller delivers, you confirm, escrow releases. Same protection as any
                  browse-and-buy order.
                </span>
              </li>
            </ol>
            <div className="mt-8">
              <Link href="/how-it-works" className="text-sm text-primary hover:underline">
                Read the full how-it-works guide →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
