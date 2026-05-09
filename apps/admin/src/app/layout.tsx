import type { Metadata } from 'next';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/components/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX Admin — admin.getx.gg',
  description: 'GETX internal admin console.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <AuthProvider>
              <PageTransition>{children}</PageTransition>
            </AuthProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
