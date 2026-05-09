import type { Metadata } from 'next';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import { SellerGuard } from '@/components/seller-guard';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX Seller — sell.getx.gg',
  description: 'GETX Seller dashboard.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      </body>
    </html>
  );
}
