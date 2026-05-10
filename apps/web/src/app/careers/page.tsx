import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, CardContent } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Careers at GETX',
  description:
    "We're a small team building the safest gaming marketplace. Open roles and how to get in touch.",
  alternates: { canonical: '/careers' },
};

const values = [
  {
    title: 'Ship fast, ship safe',
    body: 'Move quickly without skipping the parts that protect users. Every change goes through real review.',
  },
  {
    title: 'Own the outcome',
    body: 'No silos. The person closest to the problem owns the fix. We trust each other to make calls.',
  },
  {
    title: 'Honesty over polish',
    body: 'Real numbers in standups. Real concerns raised early. We catch bugs before customers do.',
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b py-16 md:py-24">
          <div className="container max-w-4xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">Help us build it.</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              We&apos;re a small early-stage team. The next person we hire will shape what GETX
              becomes. If that sounds interesting, read on.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-20 border-b">
          <div className="container max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">How we work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {values.map((v) => (
                <Card key={v.title}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground">{v.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30 border-b">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Open roles</h2>
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No public roles open right now — but we&apos;re always interested in talking to
                  senior engineers, designers, and growth folks who play games.
                </p>
                <Link href="/contact">
                  <Button variant="outline">Send an introduction</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">What we look for</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>You&apos;ve shipped real software that real users use.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>You play games, or care enough about gaming to learn the players.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>You write directly. Long Slack threads make us nervous.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">→</span>
                <span>You&apos;d rather fix one thing well than ship three things half-done.</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
