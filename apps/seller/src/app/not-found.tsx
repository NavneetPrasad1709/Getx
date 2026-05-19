import Link from 'next/link';
import Image from 'next/image';

/* GETX Seller — 404 page.
   ─────────────────────────────────────────────────────────────────────
   Branded fallback shown when a route doesn't exist. Mirrors the
   visual language of the dashboard hero so a wrong link doesn't feel
   like a broken page. Server component — no client JS shipped. */
export default function NotFound() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-6 p-8 overflow-hidden bg-background">
      {/* Ambient gradient — same dual-mode pattern as the seller shell. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 block dark:hidden"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.10), transparent 65%), linear-gradient(180deg, hsl(220 20% 99%) 0%, hsl(220 18% 97%) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden dark:block"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.14), transparent 65%), linear-gradient(180deg, hsl(222 47% 5%) 0%, hsl(222 47% 4%) 100%)',
        }}
      />

      <div className="relative h-16 w-16">
        <Image
          src="/brand/getx-mark.webp"
          alt="GETX"
          fill
          sizes="64px"
          priority
          className="drop-shadow-[0_10px_28px_hsl(var(--primary)/0.45)]"
        />
      </div>

      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary font-bold mb-3">
          404 · Page not found
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-3">
          You took a wrong turn
        </h1>
        <p className="max-w-md mx-auto text-[14px] text-muted-foreground leading-relaxed">
          That seller page doesn&apos;t exist. Head back to your dashboard and pick up where you
          left off.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 justify-center">
        <Link
          href="/"
          className="
            inline-flex items-center gap-1.5 h-12 px-6 rounded-full
            bg-gradient-to-b from-primary to-primary-hover
            text-primary-foreground text-[13.5px] font-bold
            shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
            hover:-translate-y-px transition-transform
          "
        >
          Back to dashboard
        </Link>
        <Link
          href="/listings"
          className="
            inline-flex items-center gap-1.5 h-12 px-5 rounded-full
            bg-surface ring-1 ring-border
            text-foreground text-[13.5px] font-semibold
            hover:ring-foreground/20 transition-colors
          "
        >
          My listings
        </Link>
      </div>
    </main>
  );
}
