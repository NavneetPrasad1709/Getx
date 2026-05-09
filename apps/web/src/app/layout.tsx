import type { Metadata } from 'next';
import { ThemeProvider, Toaster, CustomCursor, PageTransition } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getx.gg'),
  title: {
    default: 'GETX — Get X. Get gaming.',
    template: '%s | GETX',
  },
  description: 'The premium gaming marketplace. Verified sellers, secure escrow, instant delivery.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AuthProvider>
              <PageTransition>{children}</PageTransition>
            </AuthProvider>
          </QueryProvider>
          <Toaster />
          <CustomCursor />
        </ThemeProvider>
      </body>
    </html>
  );
}
