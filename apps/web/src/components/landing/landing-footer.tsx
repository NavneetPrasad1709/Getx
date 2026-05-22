import Link from 'next/link';
import { Twitter, MessageCircle, Instagram, Youtube, ArrowUpRight, ChevronDown } from 'lucide-react';

/* LandingFooter — Wix-Tripo light footer.

   Five-column nav on a white surface card with rounded corners, sitting
   in the light-gray page canvas. Soft watermark in low-opacity dark text.
   Blue accent on column headings. */

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    heading: 'Marketplace',
    links: [
      { label: 'Trainer accounts', href: '/games/pokemon-go/accounts' },
      { label: 'PokéCoin top-ups', href: '/games/pokemon-go/top-ups' },
      { label: 'Items & bundles', href: '/games/pokemon-go/items' },
      { label: 'Boosting & raids', href: '/games/pokemon-go/boosting' },
      { label: 'Custom requests', href: '/requests/new' },
    ],
  },
  {
    heading: 'Sell',
    links: [
      { label: 'Apply to sell', href: process.env.NEXT_PUBLIC_SELLER_URL || '#', external: true },
      { label: 'Seller program', href: '/sellers/program' },
      { label: 'Commission & payouts', href: '/sellers/payouts' },
      { label: 'Seller success stories', href: '/sellers/stories' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About GetX', href: '/about' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Trust & safety', href: '/trust' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help center', href: '/help' },
      { label: 'Contact us', href: '/contact' },
      { label: 'Refund policy', href: '/refund' },
      { label: 'Dispute resolution', href: '/disputes' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of service', href: '/terms' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Cookie policy', href: '/cookies' },
      { label: 'DMCA', href: '/dmca' },
    ],
  },
];

const SOCIALS = [
  { label: 'Twitter', href: 'https://twitter.com/getx_gg', icon: Twitter },
  { label: 'Discord', href: 'https://discord.gg/getx', icon: MessageCircle },
  { label: 'Instagram', href: 'https://instagram.com/getx.live', icon: Instagram },
  { label: 'YouTube', href: 'https://youtube.com/@getx-gg', icon: Youtube },
];

export function LandingFooter() {
  return (
    <footer className="relative px-3 sm:px-6 lg:px-8 pb-6 pt-4">
      <div className="mx-auto max-w-[1400px] bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[1.5rem] shadow-[0_2px_8px_hsl(222_24%_8%/0.04)] overflow-hidden">
        <div className="px-5 sm:px-10 lg:px-14 pt-8 sm:pt-12 pb-7 sm:pb-8">
          {/* MOBILE — collapsible accordion (native <details>).
              5 stacked columns × 4-5 links = scroll fatigue. Accordions
              keep the headings visible (still acts as a sitemap) but
              hide link lists behind a tap. */}
          <div className="sm:hidden mb-8 -mx-1">
            {COLUMNS.map((col) => (
              <details
                key={col.heading}
                className="group border-b border-[hsl(var(--border))] last:border-b-0"
              >
                <summary className="flex items-center justify-between py-3.5 px-1 cursor-pointer list-none select-none">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                    {col.heading}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <ul className="space-y-2 pb-4 px-1">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          className="block py-1 text-[14px] text-[hsl(var(--foreground)/0.78)]"
                        >
                          {link.label}
                          <ArrowUpRight className="inline h-3 w-3 ml-1 align-baseline opacity-60" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="block py-1 text-[14px] text-[hsl(var(--foreground)/0.78)]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          {/* TABLET+ — full column grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-8 gap-x-6 md:gap-8 mb-10 md:mb-12">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--primary))] mb-4">
                  {col.heading}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          className="group inline-flex items-center gap-1 text-[14px] text-[hsl(var(--foreground)/0.75)] hover:text-[hsl(var(--primary))] transition-colors duration-ui"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[14px] text-[hsl(var(--foreground)/0.75)] hover:text-[hsl(var(--primary))] transition-colors duration-ui"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* App store coming-soon row — mobile stacks vertically with
              full-width badges; tablet+ keeps side-by-side. */}
          <div className="border-t border-[hsl(var(--border))] pt-6 sm:pt-8 mb-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] sm:gap-6 items-start lg:items-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-2">
                  GETX mobile app
                </div>
                <div className="font-display text-[15px] sm:text-base font-extrabold text-[hsl(var(--foreground))] leading-tight mb-1">
                  Pre-register for early access
                </div>
                <div className="text-[12px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                  iOS &amp; Android launching Q3 2026 · 5% off your first in-app order
                </div>
              </div>
              <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
                <AppStoreBadge store="apple" />
                <AppStoreBadge store="google" />
              </div>
            </div>
          </div>

          {/* Socials + Built-for row — mobile stacks; tablet+ side-by-side */}
          <div className="border-t border-[hsl(var(--border))] pt-6 sm:pt-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="w-full sm:w-auto">
              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-2.5">
                Follow GetX
              </div>
              <div className="flex items-center gap-2">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    rel="noopener noreferrer"
                    target="_blank"
                    aria-label={s.label}
                    className="inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[hsl(var(--background))] text-[hsl(var(--foreground)/0.75)] hover:bg-[hsl(var(--primary))] hover:text-white transition-colors duration-ui"
                  >
                    <s.icon className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-1">
                Built for
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Gamers · worldwide
              </div>
            </div>
          </div>

          {/* Bottom legal bar — mobile stacks copy + links vertically */}
          <div className="border-t border-[hsl(var(--border))] pt-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[12px] text-[hsl(var(--muted-foreground))]">
            <span className="leading-relaxed">© 2026 Deccanport Technologies Pvt Ltd.</span>
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              <Link href="/terms" className="hover:text-[hsl(var(--foreground))] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[hsl(var(--foreground))] transition-colors">Privacy</Link>
              <Link href="/refund" className="hover:text-[hsl(var(--foreground))] transition-colors">Refunds</Link>
              <span className="text-[hsl(var(--primary))] font-medium">v2026.05</span>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="relative overflow-hidden pointer-events-none select-none"
        >
          <div
            className="font-display font-extrabold tracking-[-0.05em] leading-none text-[hsl(var(--foreground)/0.04)] text-center whitespace-nowrap"
            style={{ fontSize: 'clamp(4rem, 20vw, 14rem)' }}
          >
            GETX
          </div>
        </div>
      </div>
    </footer>
  );
}

/* AppStoreBadge — single-tone inline-SVG store mark.

   "Coming soon" version: the real Apple / Google badges have strict
   brand guidelines we can't ship until the apps exist + we're enrolled
   in each developer programme. These placeholders mirror the silhouette
   so the footer reads "two store buttons", but the label says soon and
   the visual is grayscale by default. */
function AppStoreBadge({ store }: { store: 'apple' | 'google' }) {
  const isApple = store === 'apple';
  return (
    <span
      className="group flex sm:inline-flex items-center justify-center sm:justify-start gap-2 h-12 px-3 sm:px-4 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--primary))] hover:text-white transition-colors cursor-not-allowed select-none ring-1 ring-[hsl(var(--foreground))] w-full sm:w-auto"
      role="img"
      aria-label={`${isApple ? 'Apple App Store' : 'Google Play'} — coming soon`}
      title="Coming soon"
    >
      {isApple ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
          <path
            fill="currentColor"
            d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
          <path
            fill="currentColor"
            d="M3.6 2.1c-.4.3-.6.8-.6 1.5v16.8c0 .7.2 1.2.6 1.5l9.4-9.9zm10.4 11.5l2.7 2.8-12.7 7.3 10-10.1zm5.9-3.4c.8.5 1.1 1.5.4 2.4-.1.2-.3.4-.5.5l-3 1.7-3-3.1 3-3.1zM4.5 2.1l12.7 7.3-2.7 2.8z"
          />
        </svg>
      )}
      <span className="flex flex-col items-start min-w-0 leading-none">
        <span className="text-[9px] uppercase tracking-wider opacity-75">
          Coming soon · {isApple ? 'iOS' : 'Android'}
        </span>
        <span className="text-[13px] font-bold mt-0.5">
          {isApple ? 'App Store' : 'Google Play'}
        </span>
      </span>
    </span>
  );
}
