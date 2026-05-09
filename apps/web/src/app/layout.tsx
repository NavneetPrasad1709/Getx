import type { Metadata } from 'next';
import { ThemeProvider, Toaster, CustomCursor, PageTransition } from '@getx/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX — Get X. Get gaming.',
  description: 'Production-grade gaming marketplace.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PageTransition>{children}</PageTransition>
          <Toaster />
          <CustomCursor />
        </ThemeProvider>
      </body>
    </html>
  );
}
