import type { Metadata } from 'next';
import { Poppins, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import { AdminGuard } from '@/components/admin-guard';
import { StepUpProvider } from '@/components/step-up-provider';
import './globals.css';

/* Self-host fonts so admin never falls back to a serif on slow Google
   Fonts networks. Publish the var names globals.css actually reads
   (--font-poppins / --font-jetbrains); it then maps those onto the GETX
   design tokens (--font-display / --font-body / --font-mono). Previously
   layout exposed the token names directly while globals.css referenced
   var(--font-poppins) — never defined — so the font fell back to serif. */
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
  title: 'GETX Admin — admin.getx.live',
  description: 'GETX internal admin console.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <AuthProvider>
              <AdminGuard>
                <StepUpProvider>
                  <PageTransition>{children}</PageTransition>
                </StepUpProvider>
              </AdminGuard>
            </AuthProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
        {/* Vercel-native observability — pageviews + Core Web Vitals.
            Low-signal on an internal console but kept for parity with
            web/seller so ops has one consistent place to read perf data. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
