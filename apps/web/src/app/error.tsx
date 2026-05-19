'use client';

import * as React from 'react';
import Link from 'next/link';

/* Global error boundary — Next.js renders this when a render-time error
   escapes a route segment. Replaces the silent blank-screen failure mode
   with an actual stack trace + recovery action. */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[GETX error boundary]', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-xl w-full rounded-2xl border border-error/40 bg-error/5 p-6 md:p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-error mb-3">
          Something broke on this page
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
          {error.name || 'Error'}: {error.message || 'Unknown error'}
        </h1>
        {error.digest ? (
          <div className="mb-4 font-mono text-[11px] text-muted-foreground">
            digest · {error.digest}
          </div>
        ) : null}
        {error.stack ? (
          <pre className="mb-6 overflow-auto max-h-72 text-[11px] font-mono leading-relaxed text-foreground/80 bg-surface-elevated/40 border border-border/40 rounded-xl p-3">
            {error.stack}
          </pre>
        ) : null}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-5 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-5 h-10 rounded-full border border-border bg-surface font-semibold text-sm hover:bg-surface-elevated transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
