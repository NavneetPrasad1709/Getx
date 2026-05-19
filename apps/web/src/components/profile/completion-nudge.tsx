'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Check, X, ArrowRight } from 'lucide-react';

/* ProfileCompletionNudge — banner that surfaces the one-time
   EARNED_PROFILE_COMPLETE bonus (100 loyalty points) for buyers whose
   profile is still missing bio, avatar, or at least one social handle.

   The actual award is fired server-side in AccountService.updateProfile
   the moment all three land together — this banner is just an attention
   ribbon. Once eligibility flips (any one of the three gates was
   already met for the bonus row to exist), the banner hides itself.

   Dismissable: a click on × persists a `getx.profile-nudge.dismissed`
   localStorage flag so we don't pester the buyer every render. */

const STORAGE_KEY = 'getx.profile-nudge.dismissed';

interface Props {
  hasBio: boolean;
  hasAvatar: boolean;
  hasSocial: boolean;
  /* When the bonus has already been earned (per the loyalty ledger),
     the banner unconditionally hides regardless of dismiss state. */
  alreadyEarned: boolean;
  /* Optional click handler — used when the nudge is mounted on a page
     that doesn't already focus the profile form, so we can scroll to
     the editable fields. */
  onActivate?: () => void;
}

export function ProfileCompletionNudge({
  hasBio,
  hasAvatar,
  hasSocial,
  alreadyEarned,
  onActivate,
}: Props) {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const completed = [hasBio, hasAvatar, hasSocial].filter(Boolean).length;
  /* All three gates met → bonus eligible (will fire on next PATCH that
     touches profile fields). Already earned → never show again. */
  if (alreadyEarned) return null;
  if (completed >= 3) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
  };

  const steps = [
    { label: 'Add a bio (20+ chars)', done: hasBio },
    { label: 'Upload an avatar', done: hasAvatar },
    { label: 'Link one social', done: hasSocial },
  ];

  return (
    <div className="relative mb-5 rounded-3xl border border-[hsl(280_85%_60%/0.3)] bg-gradient-to-br from-[hsl(280_85%_60%/0.1)] via-[hsl(var(--primary)/0.08)] to-transparent p-5 overflow-hidden">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex h-12 w-12 rounded-2xl items-center justify-center bg-[hsl(280_85%_60%/0.16)] text-[hsl(280_85%_60%)] shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold inline-flex items-center gap-2">
            Earn 100 loyalty points
            <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[hsl(280_85%_60%)]">
              ONE-TIME
            </span>
          </h3>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            Finish your public profile so buyers + sellers can read your story
            at a glance.
          </p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {steps.map((s) => (
              <li
                key={s.label}
                className={`flex items-center gap-2 text-[12px] ${
                  s.done ? 'text-[hsl(var(--success))]' : 'text-foreground/80'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full grid place-items-center text-[10px] font-bold ${
                    s.done
                      ? 'bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))]'
                      : 'bg-foreground/10 text-muted-foreground'
                  }`}
                >
                  {s.done ? <Check className="h-2.5 w-2.5" /> : ''}
                </span>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2">
            {onActivate ? (
              <button
                type="button"
                onClick={onActivate}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[hsl(280_85%_60%)] text-white text-[12.5px] font-semibold hover:bg-[hsl(280_85%_55%)] transition-colors"
              >
                Finish profile
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link
                href="/profile/settings/profile"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[hsl(280_85%_60%)] text-white text-[12.5px] font-semibold hover:bg-[hsl(280_85%_55%)] transition-colors"
              >
                Finish profile
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {completed}/3 done
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
