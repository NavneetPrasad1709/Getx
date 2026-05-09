import type { Metadata } from 'next';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX Seller — sell.getx.gg',
  description: 'GETX Seller dashboard.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PageTransition>{children}</PageTransition>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
