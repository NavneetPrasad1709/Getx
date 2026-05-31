import type { Metadata } from 'next';
import { Poppins, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider, Toaster, PageTransition, TooltipProvider } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import { CustomCursorLoader } from '@/components/custom-cursor-loader';
import { CookieConsent } from '@/components/cookie-consent';
import { serializeJsonLd } from '@/lib/json-ld';
import './globals.css';

/* next/font self-hosts the WOFF2 files at build, drops the render-
   blocking Google Fonts @import that previously lived in globals.css.
   Exposes the same --font-display / --font-body / --font-mono CSS
   variables consumed by tailwind.config and globals.css. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});
const poppinsBody = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_WEB_URL ??
  'https://www.getx.live';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GETX — Get X. Get gaming.',
    template: '%s | GETX',
  },
  description:
    'The premium gaming marketplace. Verified sellers, secure escrow, instant delivery.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

/* Organization schema — emitted on every page from the root layout so
   Google can attach the brand entity to any landing surface. Listing
   pages additionally emit Product schema inline. */
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GETX',
  url: SITE_URL,
  // WEB-LOW-032: /logo.png doesn't exist — use the actual icon; socials from env
  logo: `${SITE_URL}/icon.webp`,
  sameAs: [
    process.env.NEXT_PUBLIC_TWITTER_URL ?? 'https://twitter.com/getxgg',
    process.env.NEXT_PUBLIC_DISCORD_URL ?? 'https://discord.gg/getx',
  ].filter(Boolean),
  description:
    'The premium gaming marketplace. Verified sellers, escrow-protected orders, sub-10-minute delivery.',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GETX',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/games/pokemon-go/accounts?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${poppinsBody.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data — emits Organization + WebSite
            schemas every page so Google can attach brand entities and
            sitelinks search box. Listing pages additionally inject
            Product schema locally. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
      </head>
      <body className="antialiased overflow-x-hidden" suppressHydrationWarning>
        {/* Skip-to-content link — first focusable element on every
            page so keyboard users can bypass the header tier 1-3 nav
            and jump straight to <main id="main">. Visually hidden
            until focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:inline-flex focus:items-center focus:gap-2 focus:px-4 focus:h-11 focus:rounded-full focus:bg-primary focus:text-primary-foreground focus:text-[13px] focus:font-bold focus:shadow-lg focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background"
        >
          Skip to main content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={150} skipDelayDuration={300}>
            <QueryProvider>
              <AuthProvider>
                <PageTransition>{children}</PageTransition>
              </AuthProvider>
            </QueryProvider>
            <Toaster />
            <CustomCursorLoader />
          </TooltipProvider>
        </ThemeProvider>
        {/* Cookie consent gate — the banner stays visible until the
            user picks Accept or Reject, and the wrapper only mounts
            `<Analytics />` + `<SpeedInsights />` after explicit
            opt-in. Essential auth cookies are exempt under PECR
            Reg 6(4)(b) so they're never gated by this component. */}
        <CookieConsent />
      </body>
    </html>
  );
}
