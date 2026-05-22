import * as React from 'react';
import { cn } from '../lib/utils';

/* role="status" + aria-busy + aria-live="polite" — assistive tech
   announces "Loading" (or the caller's aria-label override) instead
   of silence while the shimmer animates. Pass a specific `aria-label`
   for richer context, e.g. <Skeleton aria-label="Loading orders">. */
function Skeleton({
  className,
  role = 'status',
  'aria-busy': ariaBusy = true,
  'aria-live': ariaLive = 'polite',
  'aria-label': ariaLabel = 'Loading',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role={role}
      aria-busy={ariaBusy}
      aria-live={ariaLive}
      aria-label={ariaLabel}
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/10',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-shimmer',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
      }}
      {...props}
    />
  );
}

export { Skeleton };
