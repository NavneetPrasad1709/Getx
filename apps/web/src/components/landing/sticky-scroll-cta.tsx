'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, X, ShieldCheck } from 'lucide-react';

/* StickyScrollCTA — persistent "Browse N drops" pill bottom-center.

   Appears after 800px scroll, hides when the page is near the bottom
   (so it doesn't overlap the footer / final CTA). Dismissable for the
   session via localStorage. Lives in <main> at page level so it
   inherits the page bg and doesn't fight the layout-level live chat
   bubble. */

const EASE = [0.22, 1, 0.36, 1] as const;
const STORAGE_KEY = 'getx.sticky-cta.dismissed';

export function StickyScrollCTA() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  React.useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const y = window.scrollY;
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (y + window.innerHeight);
      // Show after 800px scroll, hide near the page bottom
      setVisible(y > 800 && remaining > 200);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
  };

  return (
    <AnimatePresence>
      {visible && !dismissed ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: EASE }}
          // bottom-24 leaves room for mobile bottom nav + live-chat bubble
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[45] w-[min(540px,calc(100vw-2rem))]"
          role="region"
          aria-label="Browse marketplace shortcut"
        >
          <div className="flex items-center gap-2 sm:gap-3 rounded-full bg-[#14102B] text-white ring-1 ring-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] pl-3 sm:pl-4 pr-1.5 py-1.5">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
              </span>
              <span className="text-[12px] sm:text-[13px] min-w-0 truncate">
                <span className="font-bold text-white">247 drops live</span>
                <span className="hidden sm:inline text-white/55"> · escrow on every order</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold uppercase tracking-wider shrink-0">
                <ShieldCheck className="h-2.5 w-2.5" />
                Verified
              </span>
            </div>

            <Link
              href="/games/pokemon-go/accounts"
              className="group inline-flex items-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-[hsl(var(--primary))] text-[#14102B] text-[12.5px] sm:text-[13px] font-bold hover:brightness-95 transition-all shadow-[0_6px_16px_-4px_rgba(255,203,5,0.5)] shrink-0"
            >
              Browse drops
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="h-7 w-7 grid place-items-center rounded-full text-white/55 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
