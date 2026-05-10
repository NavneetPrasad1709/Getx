import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'GETX Terms of Service.',
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = '2026-05-10';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 md:py-16">
        <article className="container max-w-3xl prose-style">
          <header className="mb-10 not-prose">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </header>

          <div className="space-y-8 text-sm leading-relaxed">
            <Section title="1. Who we are">
              <p>
                GETX is operated by GETX Technologies (the &quot;Company&quot;, &quot;we&quot;,
                &quot;us&quot;). These Terms govern your use of the GETX website, mobile experience,
                and APIs (the &quot;Service&quot;). By creating an account or using the Service you
                agree to these Terms.
              </p>
            </Section>

            <Section title="2. Eligibility">
              <p>
                You must be at least 18 years old (or the age of majority in your jurisdiction). You
                must provide accurate registration information and keep it up to date. You may not
                have more than one account without our written permission.
              </p>
            </Section>

            <Section title="3. The marketplace">
              <p>
                GETX is a peer-to-peer marketplace. Sellers list gaming accounts, top-ups, items,
                and boosting services. Buyers pay for those listings via GETX-managed escrow. GETX
                is not the seller of any listing — we facilitate the transaction.
              </p>
              <p>
                We charge an 8% buyer fee (added at checkout) and a 10% seller commission (deducted
                from payout). Fees may change with notice; the fee shown at checkout is the fee that
                applies to that order.
              </p>
            </Section>

            <Section title="4. Escrow and disputes">
              <p>
                Payment for an order is held by GETX until the buyer confirms receipt or the 3-day
                auto-release window expires without a dispute being opened. If a dispute is opened
                before auto-release, GETX admin resolves the dispute based on the in-platform chat
                history, delivery proof, and other evidence supplied by both parties.
              </p>
              <p>
                GETX&apos;s decision in a dispute is final at the platform level. Both parties
                retain whatever legal rights they have under the law of their jurisdiction.
              </p>
            </Section>

            <Section title="5. Prohibited content and conduct">
              <p>You may not use GETX to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>List items you do not own or do not have the right to sell.</li>
                <li>Sell accounts that have been or will be recovered after sale.</li>
                <li>Misrepresent the contents, level, or status of an account or item.</li>
                <li>
                  Pay or be paid outside GETX (off-platform deals are not protected by escrow and
                  may result in account termination).
                </li>
                <li>Harass, threaten, or impersonate other users.</li>
                <li>
                  Use automated systems (bots, scrapers) to bid, list, or message at scale without
                  our written permission.
                </li>
              </ul>
            </Section>

            <Section title="6. Account termination">
              <p>
                We may suspend or terminate your account at any time if you violate these Terms, the
                platform rules described on the Trust &amp; Safety page, or applicable law. Funds in
                your wallet at the time of termination remain yours and are payable subject to KYC
                requirements.
              </p>
            </Section>

            <Section title="7. Game publisher policies">
              <p>
                Many game publishers prohibit account sales in their own terms of service. GETX
                provides a platform; whether trading a particular account violates the relevant
                game&apos;s ToS is a separate question that buyers and sellers must understand
                themselves. GETX is not responsible for actions taken by game publishers against
                accounts traded on the platform.
              </p>
            </Section>

            <Section title="8. Intellectual property">
              <p>
                The GETX name, logo, and platform are owned by the Company. User-generated content
                (listings, messages, reviews) belongs to the user who created it; by posting it on
                GETX, you grant us a non-exclusive licence to display, reproduce, and distribute it
                on the platform.
              </p>
            </Section>

            <Section title="9. Limitation of liability">
              <p>
                GETX is provided &quot;as is&quot;. We are not liable for indirect, consequential,
                or special damages. Our total liability for any single transaction is limited to the
                amount paid into escrow for that transaction.
              </p>
            </Section>

            <Section title="10. Changes to these Terms">
              <p>
                We may update these Terms from time to time. Material changes will be communicated
                via email or in-platform notification at least 14 days before they take effect. Your
                continued use of GETX after changes take effect constitutes acceptance of the
                updated Terms.
              </p>
            </Section>

            <Section title="11. Contact">
              <p>
                Questions about these Terms? See the{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  contact page
                </Link>
                .
              </p>
            </Section>
          </div>

          <p className="text-xs text-muted-foreground mt-12 not-prose">
            These Terms are a starting point and may be replaced with jurisdiction-specific legal
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
