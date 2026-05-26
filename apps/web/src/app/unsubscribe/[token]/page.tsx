/* Public unsubscribe landing — saved-search and notification emails
   ship the user here when they click "Unsubscribe". The page resolves
   the token against the API and confirms or apologises. No auth
   required (the token is itself the proof of ownership; rotating it
   after use is a server-side hardening detail handled by the API). */
import { notFound } from 'next/navigation';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(
      `${API_URL}/users/unsubscribe/${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();
  const result = await unsubscribe(token);

  return (
    <main className="min-h-[60svh] grid place-items-center px-6 py-16">
      <div className="max-w-md text-center space-y-4">
        {result.ok ? (
          <>
            <h1 className="font-display text-3xl font-bold">
              You&apos;re unsubscribed
            </h1>
            <p className="text-muted-foreground">
              We won&apos;t send you saved-search or marketing emails any more.
              Transactional emails (order receipts, password resets) still go
              through.
            </p>
            <Link
              href="/profile/settings/notifications"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Manage all preferences
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold">
              Link expired or invalid
            </h1>
            <p className="text-muted-foreground">
              We couldn&apos;t process that unsubscribe link. Sign in and visit
              your notification settings to opt out directly.
            </p>
            <Link
              href="/profile/settings/notifications"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Open notification settings
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
