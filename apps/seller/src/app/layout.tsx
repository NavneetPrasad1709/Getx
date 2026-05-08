import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GETX Seller — sell.getx.gg',
  description: 'GETX Seller dashboard.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
