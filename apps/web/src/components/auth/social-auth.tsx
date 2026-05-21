'use client';

import * as React from 'react';
import { toast } from '@getx/ui';

/* SocialAuth — Google + Discord buttons rendered above the email form.

   Both buttons honour env-wired endpoints when present
   (NEXT_PUBLIC_GOOGLE_AUTH_URL, NEXT_PUBLIC_DISCORD_AUTH_URL) and fall back to
   a "coming soon" toast otherwise. Keeping the surface visible — even before
   the OAuth wiring lands — sets the expectation that this marketplace plays
   nicely with the platforms gamers already live on. */

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 11.18v2.94h7.04c-.28 1.5-1.93 4.41-7.04 4.41-4.23 0-7.69-3.5-7.69-7.83S7.77 2.87 12 2.87c2.4 0 4.02.99 4.94 1.85l3.36-3.24C18.18.55 15.39-.5 12-.5 5.37-.5 0 4.97 0 11.69S5.37 23.88 12 23.88c6.93 0 11.51-4.86 11.51-11.71 0-.78-.08-1.39-.18-2H12z"
      />
    </svg>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#5865F2"
        d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.334.956-2.419 2.157-2.419 1.21 0 2.176 1.094 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.334.955-2.419 2.157-2.419 1.21 0 2.176 1.094 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}


interface ProviderButtonProps {
  label: string;
  icon: React.ReactNode;
  href?: string;
  disabled?: boolean;
}

function ProviderButton({ label, icon, href, disabled }: ProviderButtonProps) {
  const className =
    'group relative inline-flex items-center justify-center gap-2.5 h-11 w-full rounded-full border border-border/70 bg-background/40 backdrop-blur-xl px-4 text-sm font-medium transition-all duration-ui ease-apple hover:border-primary/40 hover:bg-surface/60 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';

  const inner = (
    <>
      <span className="h-5 w-5 grid place-items-center">{icon}</span>
      <span>{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toast.info(`${label} sign-in launching soon. Use email for now.`)}
      className={className}
      aria-label={`${label} (coming soon)`}
    >
      {inner}
    </button>
  );
}

export function SocialAuth({ next }: { next?: string }) {
  const googleBase = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL;
  const discordBase = process.env.NEXT_PUBLIC_DISCORD_AUTH_URL;
  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <ProviderButton
          label="Google"
          icon={<GoogleMark className="h-4 w-4" />}
          href={googleBase ? `${googleBase}${suffix}` : undefined}
        />
        <ProviderButton
          label="Discord"
          icon={<DiscordMark className="h-4 w-4" />}
          href={discordBase ? `${discordBase}${suffix}` : undefined}
        />
      </div>

      <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <div className="h-px flex-1 bg-border/60" />
        <span>or with email</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
    </div>
  );
}
