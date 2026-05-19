import type { Metadata } from 'next';
import { Poppins, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import { AdminGuard } from '@/components/admin-guard';
import './globals.css';

/* Self-host fonts so admin never falls back to a serif on slow Google
   Fonts networks. CSS vars get bound to GETX design tokens via
   globals.css. */
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
  title: 'GETX Admin — admin.getx.gg',
  description: 'GETX internal admin console.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppinsDisplay.variable} ${poppinsBody.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <AuthProvider>
              <AdminGuard>
                <PageTransition>{children}</PageTransition>
              </AdminGuard>
            </AuthProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
