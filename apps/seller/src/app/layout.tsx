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
/* Bind to the same --font-display / --font-body / --font-mono vars
   that globals.css (and tailwind.config) reference, so seller picks up
   the same Poppins everywhere headings/body/mono are styled. */
const poppinsDisplay = Poppins({
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

export const metadata: Metadata = {
  title: 'GETX Seller — sell.getx.gg',
  description: 'GETX Seller dashboard.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppinsDisplay.variable} ${poppinsBody.variable} ${jetbrains.variable}`}
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
