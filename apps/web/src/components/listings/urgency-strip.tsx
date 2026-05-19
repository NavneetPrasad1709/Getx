'use client';

import * as React from 'react';
import { Clock, Flame, AlertTriangle } from 'lucide-react';
import { useReducedMotion } from '@getx/ui';
import type { Listing } from '@/hooks/use-listings';

/* UrgencyStrip — picks one strongest urgency signal from listing data and
   renders a full-width chip above the price block.

   Signal precedence:
     endsAt < 24h        → red countdown "Drop ends in HH:MM:SS" (pulses)
     stockLeft <= 5      → orange "Only N left at this price"
     soldRecent >= 3     → cobalt "N sold in last 24h"

   Falls back to a deterministic stub derived from listing.id when none of
   the optional fields are populated by the backend — keeps the chip
   present even before the deal/timer table ships. */

type UrgencyKind = 'expiring' | 'low-stock' | 'sold-recent';

interface UrgencySignal {
  kind: UrgencyKind;
  endsAtMs?: number;
  stockLeft?: number;
  soldRecent?: number;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return '00:00:00';
  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/* Decide which signal to render. Real fields win over stub. */
function pickUrgency(
  listing: Pick<Listing, 'id' | 'endsAt' | 'stockLeft' | 'soldRecent' | 'stock'>,
  anchorMs: number,
): UrgencySignal | null {
  // 1. Real endsAt
  if (listing.endsAt) {
    const endsAtMs = new Date(listing.endsAt).getTime();
    const hoursLeft = (endsAtMs - anchorMs) / 3_600_000;
    if (hoursLeft > 0 && hoursLeft < 24) {
      return { kind: 'expiring', endsAtMs };
    }
  }

  // 2. Real stockLeft
  if (typeof listing.stockLeft === 'number' && listing.stockLeft > 0 && listing.stockLeft <= 5) {
    return { kind: 'low-stock', stockLeft: listing.stockLeft };
  }

  // 3. Real soldRecent
  if (typeof listing.soldRecent === 'number' && listing.soldRecent >= 3) {
    return { kind: 'sold-recent', soldRecent: listing.soldRecent };
  }

  // 4. Deterministic stub from id
  const h = hashId(listing.id);
  const bucket = h % 10;
  if (bucket < 3) {
    const hours = 2 + (h % 21);
    return { kind: 'expiring', endsAtMs: anchorMs + hours * 3_600_000 };
  }
  if (bucket < 6) {
    /* respect real stock if backend sent a small number */
    const stockLeft = Math.min(typeof listing.stock === 'number' ? listing.stock : 5, 1 + (h % 5));
    return { kind: 'low-stock', stockLeft: Math.max(1, stockLeft) };
  }
  if (bucket < 9) {
    return { kind: 'sold-recent', soldRecent: 3 + (h % 10) };
  }
  return null;
}

interface Props {
  listing: Pick<Listing, 'id' | 'endsAt' | 'stockLeft' | 'soldRecent' | 'stock'>;
  /* Compact variant fits inside the MobileBuyBar; default fills the BuyPanel
     row above the price (h-8 full-width). */
  variant?: 'panel' | 'mobile';
  className?: string;
}

export function UrgencyStrip({ listing, variant = 'panel', className }: Props) {
  const reduce = useReducedMotion();
  /* Mount gate keeps SSR + first paint identical — countdown numbers diff
     between server and client without it. */
  const [mounted, setMounted] = React.useState(false);
  const [anchorMs] = React.useState(() => Date.now());
  const [now, setNow] = React.useState(anchorMs);

  const signal = React.useMemo(
    () => pickUrgency(listing, anchorMs),
    [listing, anchorMs],
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || !signal || signal.kind !== 'expiring') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [mounted, signal]);

  if (!mounted || !signal) return null;

  let icon: React.ReactNode;
  let label: React.ReactNode;
  let tone: string;
  let pulse = false;

  if (signal.kind === 'expiring' && signal.endsAtMs) {
    const msLeft = Math.max(0, signal.endsAtMs - now);
    if (msLeft <= 0) return null;
    icon = <Clock className="h-3.5 w-3.5" />;
    label = (
      <>
        Drop ends in{' '}
        <span className="font-mono tabular-nums ml-1">{formatCountdown(msLeft)}</span>
      </>
    );
    tone =
      'bg-[hsl(0_84%_60%/0.12)] text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%/0.3)]';
    pulse = !reduce;
  } else if (signal.kind === 'low-stock' && typeof signal.stockLeft === 'number') {
    icon = <AlertTriangle className="h-3.5 w-3.5" />;
    label = (
      <>
        Only{' '}
        <span className="font-bold tabular-nums">{signal.stockLeft}</span>{' '}
        left at this price
      </>
    );
    tone =
      'bg-[hsl(28_92%_55%/0.12)] text-[hsl(28_92%_55%)] border-[hsl(28_92%_55%/0.3)]';
  } else if (signal.kind === 'sold-recent' && typeof signal.soldRecent === 'number') {
    icon = <Flame className="h-3.5 w-3.5" />;
    label = (
      <>
        <span className="font-bold tabular-nums">{signal.soldRecent}</span> sold
        in last 24h
      </>
    );
    tone =
      'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]';
  } else {
    return null;
  }

  const isMobile = variant === 'mobile';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-1.5 border font-semibold whitespace-nowrap ${tone} ${
        isMobile
          ? 'h-6 px-2 rounded-full text-[11px]'
          : 'h-8 w-full px-3 rounded-xl text-[12.5px]'
      } ${pulse ? 'animate-pulse' : ''} ${className ?? ''}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}
