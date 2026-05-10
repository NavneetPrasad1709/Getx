import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { HowItWorks } from '@/components/landing/how-it-works';

export const metadata: Metadata = {
  title: 'How GETX works',
  description:
    'How GETX protects every transaction — escrow holds funds until delivery is confirmed, with disputes resolved by the GETX team.',
  alternates: { canonical: '/how-it-works' },
};

const buyerSteps = [
  {
    title: 'Browse or post',
    body: 'Find what you need on the listings tabs, or post a custom request and let sellers bid for the work.',
  },
  {
    title: 'Pay into escrow',
    body: 'Funds are held by GETX TradeShield. The seller never receives money until you confirm delivery.',
  },
  {
    title: 'Confirm receipt',
    body: 'Once you have your account, items or boost, confirm in one click. Auto-released after 3 days if you do nothing.',
  },
  {
    title: 'Review',
    body: 'Rate your seller. Public reviews build the trust other buyers rely on.',
  },
];

const sellerSteps = [
  {
    title: 'Activate seller mode',
    body: 'One click on the seller dashboard. No KYC required to start listing.',
  },
  {
    title: 'List or bid',
    body: 'Publish ready-to-sell listings, or pitch on open custom requests.',
  },
  {
    title: 'Deliver',
    body: 'Mark the order delivered with proof. The buyer is notified instantly.',
  },
  {
    title: 'Get paid',
    body: 'Funds release to your wallet on buyer confirmation, or automatically after 3 days. Withdraw anytime.',
  },
];

const protections = [
  {
    title: 'Escrow on every order',
    body: 'No money moves to the seller until you confirm. Cancellations are full refunds before delivery.',
  },
  {
    title: 'Dispute resolution',
    body: 'If something goes wrong, the GETX admin team can release, refund, or split the escrow based on evidence.',
  },
  {
    title: 'Verified sellers',
    body: 'Sellers earn tiers (Verified, Premium, Elite) by completing orders and earning ratings. Filter to only buy from trusted sellers.',
  },
  {
    title: 'In-platform chat',
    body: "Coordinate delivery and ask questions inside GETX. Don't move conversations off-platform — escrow only protects in-platform deals.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">How GETX works</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              GETX is an escrow-protected marketplace for gaming accounts, top-ups, items and
              boosting services. Here&apos;s how every transaction is secured.
            </p>
          </div>
        </section>

        <HowItWorks />

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">For buyers</h2>
                <ol className="space-y-5">
                  {buyerSteps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold mb-1">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">For sellers</h2>
                <ol className="space-y-5">
                  {sellerSteps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex-shrink-0 h-8 w-8 rounded-full bg-accent/10 text-accent-foreground font-semibold flex items-center justify-center text-sm">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold mb-1">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30 border-b">
          <div className="container max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                What protects you
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                TradeShield is the set of safeguards built into every order.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {protections.map((p) => (
                <Card key={p.title}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Buyer fee
                  </div>
                  <div className="font-display text-3xl font-bold text-primary">8%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Added on top of the listing price at checkout. Funds the escrow + dispute team.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Seller commission
                  </div>
                  <div className="font-display text-3xl font-bold text-primary">10%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Deducted from the order before payout. No listing fees, no monthly
                    subscriptions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Withdrawal
                  </div>
                  <div className="font-display text-3xl font-bold text-primary">Free</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Withdraw to UPI, bank or PayPal at no cost. Currency conversion at mid-market
                    rates.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of buyers and sellers trading safely on GETX.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/games">
                <Button size="lg">Browse marketplace</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline">
                  Create an account
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
