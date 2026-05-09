import * as React from 'react';
import { cn } from '../lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
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
