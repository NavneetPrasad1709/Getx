import type { Metadata } from 'next';

/* Server-component layout — exists solely to provide rich OG / Twitter
   card metadata for shareable profile links. The page itself stays
   client-rendered for interactivity; this layout adds the SEO + social
   crawl surface without forcing a server rewrite of the page. */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://getx.gg';

interface ProfileShape {
  username: string | null;
  name: string | null;
  displayName: string | null;
  bio: string | null;
  sellerRating: number;
  totalSales: number;
  rank: string;
  country: string;
}

async function fetchProfile(username: string): Promise<ProfileShape | null> {
  try {
    const res = await fetch(
      `${API_URL}/users/by-username/${encodeURIComponent(username)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as ProfileShape;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);
  const display =
    profile?.displayName ?? profile?.name ?? profile?.username ?? username;
  const handle = profile?.username ?? username;
  const desc = profile?.bio
    ? profile.bio.slice(0, 160)
    : `${profile?.rank ?? 'ROOKIE'} on GETX · ★ ${(profile?.sellerRating ?? 0).toFixed(2)} · ${profile?.totalSales ?? 0} sales`;

  const ogImage = `${SITE_URL}/api/og/profile/${encodeURIComponent(handle)}`;
  const canonical = `${SITE_URL}/users/${encodeURIComponent(handle)}`;

  return {
    title: `${display} (@${handle}) on GETX`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${display} · @${handle} · GETX`,
      description: desc,
      url: canonical,
      siteName: 'GETX',
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `@${handle} on GETX` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${display} on GETX`,
      description: desc,
      images: [ogImage],
    },
  };
}

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
