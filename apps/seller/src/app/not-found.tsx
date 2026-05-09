import Link from 'next/link';
import { Button } from '@getx/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="font-display text-5xl font-bold">Page not found</h1>
      <p className="max-w-md text-center text-muted-foreground">
        That seller page doesn&apos;t exist. Back to the dashboard.
      </p>
      <Button asChild variant="default" size="lg">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </main>
  );
}
