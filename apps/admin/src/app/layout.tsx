import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX Admin — admin.getx.gg',
  description: 'GETX internal admin console.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
