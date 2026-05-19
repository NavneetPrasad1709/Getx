import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Contact GETX',
  description: 'How to reach the GETX team — for support, disputes, partnerships, or press.',
  alternates: { canonical: '/contact' },
};

const channels = [
  {
    label: 'Order disputes',
    detail:
      'Open the order page and click "Open dispute". This is the fastest path — admin responds within 24h.',
    cta: { label: 'My orders', href: '/profile/orders' },
  },
  {
    label: 'Account help',
    detail: 'Locked out, payments not arriving, profile not updating?',
    cta: { label: 'support@getx.live', href: 'mailto:support@getx.live' },
  },
  {
    label: 'Privacy / data requests',
    detail: 'Access, export, or delete your personal data.',
    cta: { label: 'support@getx.live', href: 'mailto:support@getx.live?subject=Privacy%20request' },
  },
  {
    label: 'Press',
    detail: 'Story ideas, interviews, statements.',
    cta: { label: 'support@getx.live', href: 'mailto:support@getx.live?subject=Press%20enquiry' },
  },
  {
    label: 'Partnerships',
    detail: 'Game studios, payment partners, content creators.',
    cta: { label: 'support@getx.live', href: 'mailto:support@getx.live?subject=Partnership' },
  },
  {
    label: 'Security disclosure',
    detail: 'Responsible disclosure of vulnerabilities. Please don’t test against live user data.',
    cta: { label: 'support@getx.live', href: 'mailto:support@getx.live?subject=Security%20disclosure' },
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Get in touch</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              GETX is run by a small team. We aim to respond within one business day on weekdays,
              longer on weekends.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {channels.map((c) => (
                <Card key={c.label}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{c.label}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{c.detail}</p>
                    {c.cta.href.startsWith('mailto:') ? (
                      <a
                        href={c.cta.href}
                        className="text-sm text-primary hover:underline font-mono"
                      >
                        {c.cta.label}
                      </a>
                    ) : (
                      <Link href={c.cta.href} className="text-sm text-primary hover:underline">
                        {c.cta.label} →
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-3xl">
            <h2 className="font-display text-xl md:text-2xl font-bold mb-3">Before you email</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Most account, payment, and delivery questions are already answered:
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="text-primary hover:underline">
                  How GETX works
                </Link>
                {' — '}the full transaction flow.
              </li>
              <li>
                <Link href="/trust" className="text-primary hover:underline">
                  Trust &amp; Safety
                </Link>
                {' — '}escrow, disputes, and platform rules.
              </li>
              <li>
                <Link href="/refund" className="text-primary hover:underline">
                  Refund Policy
                </Link>
                {' — '}every refund case spelled out.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
