import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How GETX collects, uses, and protects your personal data.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = '2026-05-10';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 md:py-16">
        <article className="container max-w-3xl">
          <header className="mb-10">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </header>

          <div className="space-y-8 text-sm leading-relaxed">
            <Section title="What we collect">
              <p>When you use GETX, we collect:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  <strong>Account info</strong> — email, password (hashed), display name, country,
                  and an optional username.
                </li>
                <li>
                  <strong>Identity verification</strong> (KYC, only when you request your first
                  withdrawal) — government ID, photo, and other documents required by our payment
                  partners.
                </li>
                <li>
                  <strong>Transaction data</strong> — orders, listings, custom requests, offers,
                  messages, reviews, and payment metadata.
                </li>
                <li>
                  <strong>Technical data</strong> — IP address, device info, user agent, and usage
                  analytics.
                </li>
              </ul>
            </Section>

            <Section title="How we use it">
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  To run the marketplace — process orders, hold escrow, deliver chat messages.
                </li>
                <li>To verify your identity when withdrawing funds (legal requirement).</li>
                <li>To prevent fraud, abuse, and account takeovers.</li>
                <li>To resolve disputes between buyers and sellers.</li>
                <li>To comply with applicable law and respond to legal requests.</li>
                <li>
                  To send transactional notifications (order updates, security alerts). Marketing
                  emails require opt-in.
                </li>
              </ul>
            </Section>

            <Section title="Who we share it with">
              <p>We share data with:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  <strong>Payment processors</strong> — Paddle (and successors) to charge your card
                  and pay sellers. They receive only the data they need to process the transaction.
                </li>
                <li>
                  <strong>KYC providers</strong> — Sumsub or Digio for identity verification, only
                  when you start the withdrawal flow.
                </li>
                <li>
                  <strong>Email and SMS providers</strong> — Resend (or successor) to send
                  notifications.
                </li>
                <li>
                  <strong>Cloud and infrastructure</strong> — AWS / Neon / Cloudflare host the
                  platform.
                </li>
                <li>
                  <strong>Legal requests</strong> — courts and government agencies, where required
                  by law.
                </li>
              </ul>
              <p className="mt-3">
                We do not sell your data. We don&apos;t share it with advertisers.
              </p>
            </Section>

            <Section title="What we don't store as plain text">
              <p>
                Passwords are stored as bcrypt hashes (never plain text). Bank
                account details and 2FA secrets are encrypted at rest. Identity
                documents collected during KYC (passport, driver&apos;s licence,
                Aadhaar, PAN, national ID) are handled by our verification
                partner Sumsub and stored only as one-way hashes on our side.
              </p>
            </Section>

            <Section title="International transfers">
              <p>
                GETX is operated globally. Your data may be processed in the
                United States (Stripe, Vercel, Cloudflare R2), Singapore
                (database replicas), and the United Kingdom (support tooling).
                We rely on Standard Contractual Clauses for EU/UK transfers
                and Sumsub&apos;s adequacy framework for verification data.
              </p>
            </Section>

            <Section title="Your rights (GDPR / UK GDPR / CCPA)">
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  Access — request a copy of everything we hold via
                  Settings → Privacy.
                </li>
                <li>
                  Erasure — close your account and request deletion. We
                  retain audit + transaction records for legal reasons.
                </li>
                <li>
                  Portability — your wallet ledger and order history export
                  as JSON.
                </li>
                <li>
                  Object / restrict — opt out of marketing in
                  Settings → Notifications. We never sell personal data to
                  third parties.
                </li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                California residents: under the CCPA we do not sell or share
                your personal information. Submit verifiable consumer
                requests to{' '}
                <a
                  href="mailto:support@getx.live?subject=Privacy%20request"
                  className="text-primary underline"
                >
                  support@getx.live
                </a>
                .
              </p>
            </Section>

            <Section title="How long we keep it">
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Active account: data retained while the account is active.</li>
                <li>
                  Closed account: most personal data deleted within 30 days. Audit logs and
                  transaction records are kept for 7 years for legal and dispute reasons.
                </li>
                <li>
                  You can request deletion via the contact page; we will comply unless we&apos;re
                  legally required to retain specific records.
                </li>
              </ul>
            </Section>

            <Section title="Your rights">
              <p>
                Depending on your location, you have rights to access, correct, export, or delete
                your personal data. Email privacy@getx.gg to exercise any of these rights. We will
                verify your identity before responding.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                We use first-party cookies for authentication (HttpOnly, Secure, SameSite=Lax) and a
                small amount of analytics. We do not use third-party advertising cookies.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                We&apos;ll let you know about material changes via email or in-app notification at
                least 14 days before they take effect.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Privacy questions go to privacy@getx.gg, or via the{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  contact page
                </Link>
                .
              </p>
            </Section>
          </div>

          <p className="text-xs text-muted-foreground mt-12">
            This policy is a starting point. It may be replaced with jurisdiction-specific legal
            language as the platform expands. Nothing here is legal advice.
          </p>
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold mb-2">{title}</h2>
      <div className="text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}
