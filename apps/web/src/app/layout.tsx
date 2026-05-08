import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX — Get X. Get gaming.',
  description: 'Production-grade gaming marketplace.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
