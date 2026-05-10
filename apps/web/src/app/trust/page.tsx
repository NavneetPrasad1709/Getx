import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Trust & Safety',
  description:
    'How GETX keeps every transaction safe — escrow, verified sellers, dispute resolution, and the rules that govern the marketplace.',
  alternates: { canonical: '/trust' },
};

const pillars = [
  {
    title: 'Escrow on every order',
    body: 'Buyer money never touches the seller until you confirm delivery. Auto-release after 3 days if no dispute is opened. Cancellations before delivery are full refunds.',
  },
  {
    title: 'Verified seller tiers',
    body: 'Sellers earn Verified, Premium, and Elite tiers based on completed orders and ratings. Filter searches to only buy from trusted sellers.',
  },
  {
    title: 'Real reviews, public profiles',
    body: 'Reviews are tied to completed orders only. No fake feedback. Both buyer and seller can review each other.',
  },
  {
    title: 'Dispute resolution',
    body: 'If something goes wrong, the GETX admin team can release the escrow, refund the buyer, or split based on evidence from chat history and delivery proof.',
  },
  {
    title: 'In-platform chat',
    body: "Coordinate inside GETX. Conversations stay tied to the order — useful evidence if a dispute opens. Don't move chats off-platform; escrow only protects in-platform deals.",
  },
  {
    title: 'Audit-logged admin actions',
    body: 'Every admin override (force-release, refund, ban) is logged and reviewable. No anonymous interventions on your account.',
  },
];

const buyerProtections = [
  'Money held in escrow until you confirm receipt',
  '3-day auto-release window — plenty of time to test the account or item',
  'Full refund on cancellation before delivery',
  'Public reviews you can read before paying',
  'Block-and-report flow for any seller misbehaviour',
];

const sellerProtections = [
  'Verified buyers only (email + optional phone verification)',
  'Buyer ratings visible before you accept an offer',
  'Delivery proof preserved with the order forever',
  'Force-release path if a buyer goes silent past auto-release',
  'Withdrawals to UPI, bank, or PayPal at no cost',
];

const rules = [
  {
    title: 'No off-platform deals',
    body: 'Asking buyers to pay outside GETX (UPI direct, crypto, etc.) voids escrow protection and can result in a permanent ban.',
  },
  {
    title: 'No misrepresentation',
    body: 'Listings must accurately describe what is being sold. Stock photos are fine, but stats and contents must match reality.',
  },
  {
    title: 'No recovered accounts',
    body: 'Accounts must be fully owned by the seller. Sellers caught recovering accounts after sale are banned and the buyer is refunded.',
  },
  {
    title: 'No unauthorized boosting',
    body: 'Boosters working on a buyer’s account must follow the agreed scope. No installing modded clients or unauthorized software.',
  },
  {
    title: 'Respect the chat',
    body: 'No harassment, threats, or off-topic spam. Reports go straight to admin.',
  },
];

export default function TrustSafetyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <span className="inline-block text-xs uppercase tracking-wider text-primary font-semibold mb-4">
              TradeShield
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Trust &amp; Safety</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Real money, gaming assets, and digital strangers — that combo doesn&apos;t work
              without serious safeguards. Here&apos;s the system that protects every GETX
              transaction.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">The six pillars</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pillars.map((p) => (
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

        <section className="py-16 md:py-20 bg-muted/30 border-b">
          <div className="container max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold mb-5">
                  If you&apos;re buying
                </h2>
                <ul className="space-y-3">
                  {buyerProtections.map((line) => (
                    <li key={line} className="flex gap-3 text-sm">
                      <span className="text-primary font-bold flex-shrink-0">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold mb-5">
                  If you&apos;re selling
                </h2>
                <ul className="space-y-3">
                  {sellerProtections.map((line) => (
                    <li key={line} className="flex gap-3 text-sm">
                      <span className="text-primary font-bold flex-shrink-0">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">The rules</h2>
            <p className="text-muted-foreground mb-8">
              Break these and we will refund the affected buyer, ban the account, and forfeit any
              pending payout.
            </p>
            <div className="space-y-3">
              {rules.map((r, i) => (
                <Card key={r.title}>
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <span className="font-display text-2xl font-bold text-muted-foreground/40 leading-none">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="font-semibold mb-1">{r.title}</h3>
                        <p className="text-sm text-muted-foreground">{r.body}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Reporting a problem
            </h2>
            <p className="text-muted-foreground mb-6">
              If a transaction goes wrong, open a dispute from the order page. The GETX admin team
              reviews chat history, delivery proof, and both sides&apos; statements before deciding
              the outcome.
            </p>
            <Card>
              <CardContent className="p-6 space-y-3 text-sm">
                <p>
                  <strong>Standard SLA:</strong> first response within 24h, resolution within 72h
                  for most disputes.
                </p>
                <p>
                  <strong>Evidence we accept:</strong> in-platform chat history, delivery proof
                  images/videos, account-recovery notifications.
                </p>
                <p>
                  <strong>Evidence we ignore:</strong> screenshots from off-platform chats (Discord,
                  WhatsApp), claims without matching delivery proof.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
              Questions about safety?
            </h2>
            <p className="text-muted-foreground mb-8">
              Read how every transaction works step-by-step, or jump straight into browsing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  How GETX works
                </Button>
              </Link>
              <Link href="/games">
                <Button size="lg">Browse marketplace</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
