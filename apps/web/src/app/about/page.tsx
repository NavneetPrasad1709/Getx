import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'About GETX',
  description:
    'GETX is the escrow-protected marketplace for gaming accounts, top-ups, items, and boosting services.',
  alternates: { canonical: '/about' },
};

const beliefs = [
  {
    title: 'Gamers should own their assets',
    body: 'Hours of grinding, levelled accounts, hard-won items — these have value. GETX makes it safe to buy and sell them without getting scammed.',
  },
  {
    title: 'Trust is built, not claimed',
    body: 'Every order is escrow-protected. Every review is tied to a completed order. Every admin action is audit-logged. The system earns trust by being verifiable.',
  },
  {
    title: 'Sellers deserve fair payouts',
    body: '10% commission. No listing fees, no monthly subscriptions, no withdrawal fees. Most marketplaces charge 20-30% — we make money by keeping volume high, not by extracting from sellers.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              We&apos;re building the safest gaming marketplace.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              GETX exists because every existing way to buy or sell a gaming account is broken.
              Discord scams. Forum middlemen. Sketchy third-party sites. We&apos;re replacing all of
              that with one escrow-protected platform.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">What we believe</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {beliefs.map((b) => (
                <Card key={b.title}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30 border-b">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">The team</h2>
            <p className="text-muted-foreground mb-4">
              GETX is being built in India by a small team with a long history in gaming and
              payments. We&apos;re hiring as we grow — if you want to help build the future of
              digital-asset trading, say hi.
            </p>
            <Link href="/careers" className="text-primary hover:underline text-sm">
              See open roles →
            </Link>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Try GETX</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/games">
                <Button size="lg">Browse marketplace</Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  How it works
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
