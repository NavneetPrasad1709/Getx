import type { Metadata } from 'next';
import { buildListingMetadata } from '@/lib/listing-og';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildListingMetadata(slug, 'accounts');
}

export default function AccountListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
