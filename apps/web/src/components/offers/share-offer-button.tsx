'use client';

import * as React from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from '@getx/ui';

/* Native share-sheet button for the public offer viewer.

   1. Tries `navigator.share` — surfaces the iOS/Android share sheet.
   2. Falls back to clipboard write with toast.
   3. Final fallback (clipboard blocked) is a toast instructing the user
      to copy manually — we never silently fail. */

interface Props {
  offerId: string;
  shareUrl: string;
  /* Render style. `pill` is the inline variant used on the public viewer
     header; `icon` matches the small circular share buttons used on
     listing PDPs. */
  variant?: 'pill' | 'icon';
}

export function ShareOfferButton({ offerId, shareUrl, variant = 'pill' }: Props) {
  const [copied, setCopied] = React.useState(false);

  const share = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const title = 'Custom offer on GETX';
    const text = `View this custom-request offer on GETX (#${offerId.slice(0, 8)}).`;
    if ('share' in navigator) {
      try {
        await (
          navigator as Navigator & { share: (data: ShareData) => Promise<void> }
        ).share({ title, text, url: shareUrl });
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        toast.success('Offer link copied');
      } catch {
        toast.error('Clipboard blocked — copy manually');
      }
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={share}
        aria-label="Share offer"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-surface/60 hover:bg-surface text-foreground/80 hover:text-foreground transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border/60 bg-surface/60 hover:bg-surface text-foreground text-[12.5px] font-semibold transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
      ) : (
        <Share2 className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied' : 'Share offer'}
    </button>
  );
}
