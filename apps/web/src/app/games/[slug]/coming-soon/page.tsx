import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Clock, MessageCircle, Users } from 'lucide-react';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { WaitlistForm } from '@/components/coming-soon/waitlist-form';
import { getComingSoonGame, listComingSoonGames } from '@/lib/coming-soon-games';

/* /games/[slug]/coming-soon — pre-launch landing for upcoming games.
 *
 * One template, three games. Each route is statically generated from
 * COMING_SOON_GAMES so SEO indexes them as real pages and search
 * intent ("buy valorant accounts") lands on a polished waitlist page
 * instead of bouncing.
 *
 * Live games (Pokémon GO) are NOT in COMING_SOON_GAMES, so requests
 * like /games/pokemon-go/coming-soon → notFound(). The static route
 * /games/pokemon-go takes priority over this dynamic one anyway.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listComingSoonGames().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = getComingSoonGame(slug);
  if (!game) return { title: 'Coming soon — GETX' };

  const title = `${game.name} on GETX — coming ${game.timeline}`;
  const description = `Be the first to buy ${game.name} accounts, top-ups, and boosting on GETX. ${game.expectedLine}. Join the waitlist for a $5 launch credit.`;

  return {
    title,
    description,
    alternates: { canonical: `/games/${game.slug}/coming-soon` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: game.poster, width: 1280, height: 720, alt: game.name }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ComingSoonPage({ params }: PageProps) {
  const { slug } = await params;
  const game = getComingSoonGame(slug);
  if (!game) notFound();

  const otherGames = listComingSoonGames().filter((g) => g.slug !== slug);

  /* CSS var the page uses to tint per-game accents — bg-radial, ring,
     glow. Avoids re-implementing the same color in 4 places. */
  const hueVar = { '--game-hue': game.glowHue } as React.CSSProperties;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" style={hueVar}>
      <Header />

      <main className="relative flex-1">
        {/* HERO — full-bleed game poster, gradient overlay so text reads. */}
        <section
          aria-label={`${game.name} — coming soon`}
          className="relative overflow-hidden"
        >
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] max-h-[640px]">
            <Image
              src={game.poster}
              alt={game.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />

            {/* Bottom gradient for headline legibility */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10"
            />
            {/* Tinted ambient from the side using --game-hue */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 50% 80% at 0% 100%, hsl(var(--game-hue) 90% 50% / 0.18), transparent 60%)`,
              }}
            />
          </div>

          {/* Hero content sits on top of the image, breathes into the
              fade-to-bg below it. */}
          <div className="absolute inset-0 flex items-end">
            <div className="container pb-10 md:pb-14 lg:pb-16">
              <Link
                href="/games"
                className="
                  inline-flex items-center gap-1.5 mb-5
                  text-[11.5px] font-mono uppercase tracking-[0.22em] text-foreground/65
                  hover:text-foreground transition-colors
                "
              >
                <ArrowLeft className="h-3 w-3" />
                All games
              </Link>

              <div className="flex items-center gap-3 mb-4">
                <span
                  className="
                    inline-flex items-center gap-1.5 rounded-full px-3 py-1
                    bg-background/70 backdrop-blur-md
                    ring-1 ring-border
                    text-[10.5px] uppercase tracking-[0.22em] font-mono font-semibold text-foreground
                  "
                >
                  <Clock className="h-3 w-3" strokeWidth={2.5} />
                  {game.timeline}
                </span>
                <span
                  className="
                    inline-flex items-center gap-1.5 rounded-full px-3 py-1
                    bg-primary text-primary-foreground
                    text-[10.5px] uppercase tracking-[0.22em] font-mono font-bold
                    shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]
                  "
                >
                  Coming Soon
                </span>
              </div>

              <h1 className="font-display font-bold uppercase leading-[0.85] tracking-[-0.025em] text-[clamp(2.5rem,7vw,5.5rem)] text-foreground mb-4 [text-shadow:0_4px_24px_rgb(0_0_0_/_0.55)]">
                {game.name}
              </h1>

              <p className="max-w-2xl text-[14px] md:text-base text-foreground/75 leading-relaxed">
                {game.tagline}
              </p>
            </div>
          </div>
        </section>

        {/* WAITLIST */}
        <section aria-label="Join the waitlist" className="border-t border-border/40">
          <div className="container py-14 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="font-display font-bold leading-[0.9] tracking-[-0.025em] text-[clamp(1.75rem,3vw,2.5rem)] text-foreground mb-3">
                Get the drop notification.
              </h2>
              <p className="text-[14.5px] text-muted-foreground leading-relaxed max-w-md">
                {game.expectedLine}. Drop your email and we&apos;ll ping you the
                moment {game.name} listings go live — plus credit your wallet
                with $5 for being early.
              </p>

              {/* Social proof line */}
              <div className="mt-6 inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-foreground/75">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>
                  <span className="text-foreground font-bold tabular-nums">
                    {game.waitlistSeed.toLocaleString('en-US')}+
                  </span>
                  {' '}already waiting
                </span>
              </div>
            </div>

            <div className="lg:justify-self-end w-full lg:max-w-md">
              <WaitlistForm slug={game.slug} gameName={game.name} />
            </div>
          </div>
        </section>

        {/* WHAT'S COMING — 4 category cards */}
        <section
          aria-label={`What GETX will offer for ${game.name}`}
          className="border-t border-border/40"
        >
          <div className="container py-14 md:py-20">
            <div className="max-w-2xl mb-10 md:mb-12">
              <h2 className="font-display font-bold leading-[0.9] tracking-[-0.025em] text-[clamp(1.75rem,3vw,2.5rem)] text-foreground mb-3">
                What ships on{' '}
                <span className="italic font-light text-primary">day one</span>.
              </h2>
              <p className="text-[14.5px] text-muted-foreground leading-relaxed">
                The same escrow + verified-seller stack you get on Pokémon GO —
                wired up for {game.name} from launch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {game.categories.map((cat) => (
                <div
                  key={cat.title}
                  className="
                    group relative rounded-2xl
                    bg-surface ring-1 ring-border
                    p-5 md:p-6
                    hover:ring-[hsl(var(--game-hue)_90%_50%/0.4)]
                    hover:-translate-y-0.5
                    transition-all duration-200
                  "
                >
                  <div
                    className="
                      inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4
                      bg-primary/10 text-primary
                      ring-1 ring-primary/20
                    "
                  >
                    <cat.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-base font-bold tracking-tight text-foreground mb-1.5">
                    {cat.title}
                  </h3>
                  <p className="text-[12.5px] text-muted-foreground leading-snug">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMMUNITY CTA */}
        <section className="border-t border-border/40">
          <div className="container py-12 md:py-16">
            <div
              className="
                relative overflow-hidden rounded-3xl
                bg-surface ring-1 ring-border
                p-6 md:p-10 lg:p-12
              "
            >
              <div
                aria-hidden
                className="absolute -top-32 -right-32 h-80 w-80 rounded-full blur-[110px]"
                style={{ background: 'hsl(var(--game-hue) 90% 50% / 0.25)' }}
              />
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-xl">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary mb-2">
                    Want to shape the launch?
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">
                    Join the GETX Discord.
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Vote on which game launches next, get early-access to the
                    {' '}{game.name} beta, and chat with the team building it.
                  </p>
                </div>
                <a
                  href="https://discord.gg/getx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center justify-center gap-2
                    h-11 px-5 rounded-full shrink-0
                    bg-foreground text-background
                    text-[13px] font-semibold tracking-tight
                    hover:-translate-y-px hover:shadow-[0_8px_24px_-8px_hsl(var(--foreground)/0.35)]
                    transition-all duration-150
                  "
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                  Open Discord
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* OTHER COMING-SOON GAMES */}
        {otherGames.length > 0 ? (
          <section
            aria-label="Other upcoming games"
            className="border-t border-border/40"
          >
            <div className="container py-12 md:py-16">
              <div className="flex items-end justify-between mb-6 md:mb-8 gap-4 flex-wrap">
                <h3 className="font-display text-lg md:text-xl font-bold text-foreground tracking-tight">
                  Also coming to GETX
                </h3>
                <Link
                  href="/games"
                  className="
                    group inline-flex items-center gap-1.5
                    text-[11.5px] font-mono uppercase tracking-[0.22em]
                    text-foreground/60 hover:text-foreground
                    transition-colors
                  "
                >
                  All games
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {otherGames.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/games/${g.slug}/coming-soon`}
                    className="
                      group relative block overflow-hidden rounded-2xl
                      ring-1 ring-border hover:ring-foreground/25
                      transition-all duration-300
                    "
                  >
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={g.poster}
                        alt={g.name}
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
                      />
                      <div className="absolute inset-0 p-5 flex flex-col justify-between">
                        <span
                          className="
                            self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
                            bg-background/80 backdrop-blur-md ring-1 ring-border
                            text-[10px] uppercase tracking-[0.22em] font-mono font-semibold text-foreground
                          "
                        >
                          <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                          {g.timeline}
                        </span>
                        <div>
                          <h4 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(1.25rem,2.2vw,1.75rem)] text-foreground [text-shadow:0_2px_12px_rgb(0_0_0_/_0.4)]">
                            {g.name}
                          </h4>
                          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.22em] text-primary group-hover:translate-x-0.5 transition-transform">
                            Join waitlist <ArrowUpRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <LandingFooter />
    </div>
  );
}

/* Page files can only export the canonical Next exports (default,
   metadata, generateMetadata, generateStaticParams, …). Other surfaces
   that need COMING_SOON_GAMES should import from
   `@/lib/coming-soon-games` directly. */
