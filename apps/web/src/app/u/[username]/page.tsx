import { redirect } from 'next/navigation';

/* Short-URL alias for shareable profile links. `https://getx.live/u/{username}`
   permanently redirects to the canonical `/users/{username}` page so OG
   crawlers + share-sheet previews resolve correctly while users get a
   shorter pasteable link. */

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ShortProfileRedirect({ params }: Props) {
  const { username } = await params;
  redirect(`/users/${username}`);
}
