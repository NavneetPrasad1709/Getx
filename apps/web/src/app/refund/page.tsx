import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When refunds are issued on GETX — full, partial, and edge cases.',
  alternates: { canonical: '/refund' },
};

const LAST_UPDATED = '2026-05-10';

const cases = [
  {
    label: 'Full refund',
    color: 'bg-success/10 text-success',
    title: 'Buyer cancels before delivery',
    body: 'If the seller has not yet marked the order as delivered, the buyer can cancel any time and the full amount (including the buyer fee) is refunded.',
  },
  {
    label: 'Full refund',
    color: 'bg-success/10 text-success',
    title: 'Seller fails to deliver',
    body: 'If the seller does not deliver within the agreed timeline, the buyer can open a dispute. If we confirm non-delivery, the buyer is fully refunded and the seller is penalised.',
  },
  {
    label: 'Full refund',
    color: 'bg-success/10 text-success',
    title: 'Account recovered after sale',
    body: 'If a sold account is recovered by the original seller, we refund the buyer in full and the seller is permanently banned with all pending payouts forfeited.',
  },
  {
    label: 'Partial refund',
    color: 'bg-warning/10 text-warning',
    title: 'Item materially different from listing',
    body: 'If what was delivered is partially different from the listing — wrong region, missing items, lower stats — admin may issue a partial refund proportional to the difference.',
  },
  {
    label: 'No refund',
    color: 'bg-error/10 text-error',
    title: 'After auto-release',
    body: 'Once the 3-day auto-release window passes without a dispute being opened, the order is closed and refunds are not available through the platform.',
  },
  {
    label: 'No refund',
    color: 'bg-error/10 text-error',
    title: 'Off-platform deals',
    body: 'Payments made outside GETX (UPI direct, crypto, etc.) are not protected by escrow and we cannot refund them.',
  },
];

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Refund Policy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Most disputes resolve in your favour automatically — escrow is the default. Here are
              the specific cases and what happens in each.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: {LAST_UPDATED}</p>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">Refund cases</h2>
            <div className="space-y-3">
              {cases.map((c) => (
                <Card key={c.title}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4 flex-wrap">
                      <span
                        className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded ${c.color}`}
                      >
                        {c.label}
                      </span>
                      <div className="flex-1 min-w-[200px]">
                        <h3 className="font-semibold mb-1">{c.title}</h3>
                        <p className="text-sm text-muted-foreground">{c.body}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30 border-b">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              How long refunds take
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>
                  <strong>Cancellation before delivery:</strong> instant reversal, money back in
                  your original payment method within 3-5 business days (depends on your bank).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>
                  <strong>Dispute-driven refund:</strong> 3-7 business days after admin decision.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>
                  <strong>Buyer fee:</strong> refunded along with the principal in all full-refund
                  cases.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
              How to request a refund
            </h2>
            <p className="text-muted-foreground mb-4">
              Open the order page and click &quot;Open dispute&quot; (available before
              auto-release). The GETX admin team responds within 24 hours.
            </p>
            <p className="text-sm text-muted-foreground">
              For anything not covered here, see the{' '}
              <Link href="/contact" className="text-primary hover:underline">
                contact page
              </Link>{' '}
              or the{' '}
              <Link href="/trust" className="text-primary hover:underline">
                Trust &amp; Safety overview
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
