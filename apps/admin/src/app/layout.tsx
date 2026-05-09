import type { Metadata } from 'next';
import { ThemeProvider, Toaster, PageTransition } from '@getx/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX Admin — admin.getx.gg',
  description: 'GETX internal admin console.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <PageTransition>{children}</PageTransition>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
