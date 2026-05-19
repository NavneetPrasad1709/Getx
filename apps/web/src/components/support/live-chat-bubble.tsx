'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MessageCircle,
  X,
  Mail,
  HelpCircle,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

/* LiveChatBubble — fixed bottom-right support widget.

   Closed: small primary-coloured circle with chat icon + ping dot.
   Open: 340x440 floating panel with online status, three quick actions
   (chat with us / email us / help center), and a tiny operating-hours
   line. No live chat service hooked up yet — clicking "Chat" routes to
   /contact?topic=chat. Easy to swap to Crisp/Intercom later. */

const EASE = [0.22, 1, 0.36, 1] as const;

export function LiveChatBubble() {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      // bottom-20 leaves room for the mobile bottom nav on phones
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[55] flex flex-col items-end gap-3"
      aria-live="polite"
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[0_24px_60px_-16px_hsl(0_0%_0%/0.35)] overflow-hidden"
            role="dialog"
            aria-label="GETX support"
          >
            {/* Header */}
            <div
              className="px-5 py-4 text-white"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-70 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-[15px] font-extrabold leading-tight">
                      Hi, we&apos;re online
                    </div>
                    <div className="text-[11.5px] text-white/80">
                      Median first reply · 5 minutes
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close support"
                  className="h-7 w-7 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-2">
              <ActionRow
                href="/contact?topic=chat"
                icon={MessageCircle}
                title="Chat with support"
                subtitle="Open a thread — order issues, refunds, disputes"
              />
              <ActionRow
                href="/how-it-works"
                icon={HelpCircle}
                title="Help centre"
                subtitle="Browse guides, FAQs, and policies"
              />
              <ActionRow
                href="mailto:support@getx.live"
                icon={Mail}
                title="Email support"
                subtitle="support@getx.live · async, within 24h"
              />
            </div>

            {/* Footer microline */}
            <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex items-center justify-between gap-3 text-[11px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-elevated))]">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3 text-[hsl(var(--primary))]" />
                Live · IST 10am–11pm
              </span>
              <span>v2026.05</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-label={open ? 'Close support' : 'Open support'}
        className={`relative h-13 w-13 sm:h-14 sm:w-14 rounded-full text-white grid place-items-center shadow-[0_12px_28px_-6px_hsl(var(--primary)/0.5)] transition-transform duration-300 hover:scale-105 ${
          open ? 'rotate-180' : ''
        }`}
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
          height: '3.25rem',
          width: '3.25rem',
        }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#10B981] ring-2 ring-[hsl(var(--background))]"
          />
        ) : null}
      </button>
    </div>
  );
}

function ActionRow({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  const external = href.startsWith('mailto:');
  const Cmp = external ? 'a' : Link;
  return (
    <Cmp
      href={href}
      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-[hsl(var(--surface-elevated))] transition-colors"
    >
      <span className="h-10 w-10 rounded-xl grid place-items-center bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] shrink-0">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-[hsl(var(--foreground))] truncate">
          {title}
        </div>
        <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] truncate">
          {subtitle}
        </div>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Cmp>
  );
}
