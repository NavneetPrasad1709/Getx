'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Gift, Copy, Check, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, Button, toast } from '@getx/ui';
import { SlideToUnlock } from '@/components/ui/reward-card';
import { useAuth } from '@/hooks/use-auth';
import { useMyReferrals } from '@/hooks/use-referrals';

/* PaymentRewardModal — post-payment celebration moment.
 *
 * Pops once when the order page loads with ?payment=success, then sets a
 * sessionStorage flag keyed by orderId so a refresh doesn't re-trigger
 * the confetti spam. The user slides to reveal their referral reward
 * (real, tied to their account) and can copy the link in one tap.
 */

/* Confetti is client-only and pulls window/canvas — dynamic-import so it
   never lands in the server bundle. */
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

function useWindowSize() {
  const [size, setSize] = React.useState({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  });
  React.useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return size;
}

interface PaymentRewardModalProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

export function PaymentRewardModal({ orderId, open, onClose }: PaymentRewardModalProps) {
  const { isAuthenticated } = useAuth();
  const { data: mine } = useMyReferrals(isAuthenticated);
  const { width, height } = useWindowSize();

  const [unlocked, setUnlocked] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const code = mine?.code ?? '';
  const shareUrl = code ? `https://getx.gg/r/${code}` : '';

  const handleUnlock = React.useCallback(() => {
    setUnlocked(true);
    try {
      sessionStorage.setItem(`getx:reward-claimed:${orderId}`, '1');
    } catch {
      /* sessionStorage blocked — ignore, modal still works for this session */
    }
  }, [orderId]);

  const handleCopy = async () => {
    if (!shareUrl || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Referral link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed — long-press the link instead');
    }
  };

  /* Reset on close so the next open() starts fresh. */
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
      setTimeout(() => setUnlocked(false), 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
        {unlocked && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={350}
            gravity={0.12}
            tweenDuration={6000}
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}
          />
        )}

        <SlideToUnlock
          onUnlock={handleUnlock}
          sliderText="Slide to claim your reward"
          unlockedContent={
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/30 p-5">
                <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-[0.2em] mb-2">
                  <Sparkles className="h-3 w-3" /> Your reward
                </div>
                <div className="font-display text-lg font-bold leading-tight mb-1">
                  Get $10 for every friend who trades.
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Share your referral link — when a friend completes their first
                  order, $10 hits your wallet. They get $5 off too.
                </p>
              </div>

              {shareUrl ? (
                <button
                  onClick={handleCopy}
                  className="w-full group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-primary/40 transition-colors"
                  aria-label="Copy referral link"
                >
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      Your link
                    </div>
                    <div className="text-sm font-mono truncate text-foreground">
                      {shareUrl}
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </span>
                </button>
              ) : (
                <div className="rounded-xl border border-border/60 bg-surface px-4 py-3 text-xs text-muted-foreground">
                  Sign in to grab your referral link.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button asChild variant="ghost" size="sm" className="flex-1">
                  <Link href="/profile/referrals">See referral page</Link>
                </Button>
                <Button onClick={() => handleOpenChange(false)} size="sm" className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          }
        >
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-primary shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)]">
              <Gift className="h-10 w-10" />
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Payment locked in escrow.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your seller is on it. While you wait — slide below to unlock
              your trader reward.
            </p>
          </div>
        </SlideToUnlock>
      </DialogContent>
    </Dialog>
  );
}
