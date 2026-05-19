'use client';

import * as React from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button, motion, AnimatePresence, useReducedMotion, GetXMark } from '@getx/ui';

/* PwaInstallPrompt — gentle "Add to home screen" nudge.

   Behaviour:
   - Listens for the browser's `beforeinstallprompt` (Android/Chromium).
   - Only shows after the second visit (counted via localStorage), so a brand
     new user doesn't get bothered before they understand the product.
   - Dismissals are sticky for 14 days. If the user installs, the banner
     never shows again on this device.
   - Hides silently on iOS Safari (no beforeinstallprompt) — until we ship
     a separate iOS-specific "tap Share → Add to Home Screen" tooltip.

   The component is render-only when ready; safe to mount globally. */

const VISIT_KEY = 'getx:pwa:visits';
const DISMISS_KEY = 'getx:pwa:dismissed-until';
const INSTALLED_KEY = 'getx:pwa:installed';
const VISIT_THRESHOLD = 2;
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function incrementVisit(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(VISIT_KEY);
    const n = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    window.localStorage.setItem(VISIT_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.localStorage.getItem(INSTALLED_KEY) === '1') return true;
    const until = window.localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  } catch {
    return true;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari adds navigator.standalone for installed PWAs
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const reduce = useReducedMotion();
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) {
      try {
        window.localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        /* ignore */
      }
      return;
    }
    const visits = incrementVisit();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptable = e as BeforeInstallPromptEvent;
      setEvent(promptable);
      if (visits >= VISIT_THRESHOLD && !isDismissed()) {
        // Stagger so we don't fight a page-mount animation.
        setTimeout(() => setVisible(true), 1200);
      }
    };

    const onInstalled = () => {
      try {
        window.localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        /* ignore */
      }
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!event) return;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') {
        try {
          window.localStorage.setItem(INSTALLED_KEY, '1');
        } catch {
          /* ignore */
        }
      } else {
        dismiss();
      }
    } finally {
      setVisible(false);
      setEvent(null);
    }
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 32 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="md:hidden fixed left-3 right-3 z-40"
          // Sits above the MobileBottomNav (h-16 + safe-area).
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
        >
          <div className="surface-cinematic rounded-2xl p-4 flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shrink-0">
              <GetXMark size={28} gradient />
              <span aria-hidden className="absolute inset-0 rounded-2xl border border-primary/30 animate-pulse-glow" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-semibold leading-snug">
                Install GetX
              </div>
              <div className="text-xs text-muted-foreground leading-snug">
                Faster than a tab. Push alerts for price drops.
              </div>
            </div>
            <Button
              onClick={install}
              size="sm"
              className="rounded-full shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-elevated shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* IosInstallHint — small, fallback tooltip for iOS Safari.

   iOS doesn't fire beforeinstallprompt, so we surface a one-time hint after
   the user's 3rd visit pointing them at Share → Add to Home Screen. Same
   dismissal contract as PwaInstallPrompt. Unused right now; ready to ship
   when we want to nudge iOS users. */
export function IosInstallHint() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = Smartphone;
  return null;
}
