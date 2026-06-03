import type { Metadata } from 'next';
import { Poppins, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import { SellerGuard } from '@/components/seller-guard';
import './globals.css';

/* Self-host Poppins via next/font/google.
   The @import url(...) in @getx/ui/styles can fail silently when
   Google Fonts is slow/blocked, which makes browsers fall back to
   Times New Roman (default serif). next/font guarantees the file is
   inlined and preloaded, and exposes CSS vars we wire onto <html> so
   the design tokens --font-display and --font-body resolve to the
   loaded family. */
/* Publish the SAME var names globals.css reads — `--font-poppins` and
   `--font-jetbrains`. globals.css then maps those onto the GETX design tokens
   (--font-display / --font-body / --font-mono). Previously layout exposed the
   token names directly (--font-display/body/mono) while globals.css still
   referenced var(--font-poppins) — which was never defined, so every token fell
   back to local 'Poppins'/serif and the self-hosted font never applied. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'GETX Seller — sell.getx.live',
  description: 'GETX Seller dashboard.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AuthProvider>
              <SellerGuard>
                <PageTransition>{children}</PageTransition>
              </SellerGuard>
            </AuthProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
        {/* Vercel-native observability — pageviews + Core Web Vitals.
            No-op outside Vercel deploys. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
