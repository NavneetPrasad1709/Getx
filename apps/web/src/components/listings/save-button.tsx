'use client';

import * as React from 'react';
import { Heart } from 'lucide-react';
import { motion, useReducedMotion, toast } from '@getx/ui';
import { useWishlist } from '@/hooks/use-wishlist';
import type { Listing } from '@/hooks/use-listings';

/* SaveButton — heart toggle. Lives in the corner of every listing card and
   on the detail page. Tap pulses + toasts. Stops link navigation when the
   button sits inside a parent <Link>. */

interface Props {
  listing: Listing;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'overlay' | 'inline';
  className?: string;
}

export function SaveButton({ listing, size = 'md', variant = 'overlay', className = '' }: Props) {
  const reduce = useReducedMotion();
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(listing.id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggle(listing);
    toast.success(result.saved ? 'Saved to wishlist' : 'Removed from wishlist');
  };

  const sizing =
    size === 'sm'
      ? 'h-8 w-8'
      : size === 'lg'
        ? 'h-11 w-11'
        : 'h-9 w-9';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  const surface =
    variant === 'overlay'
      ? `bg-background/70 backdrop-blur-xl border border-border/40 hover:border-hot/40`
      : `bg-surface/60 border border-border/60 hover:border-hot/40`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`group relative inline-flex items-center justify-center rounded-full transition-all duration-ui ease-apple hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_hsl(var(--hot)/0.5)] ${sizing} ${surface} ${className}`}
    >
      <motion.span
        initial={false}
        animate={
          reduce
            ? undefined
            : saved
              ? { scale: [1, 1.25, 1] }
              : { scale: 1 }
        }
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex"
      >
        <Heart
          className={`${iconSize} transition-colors duration-ui ${
            saved ? 'fill-hot text-hot' : 'text-foreground/80 group-hover:text-hot'
          }`}
          aria-hidden
        />
      </motion.span>
    </button>
  );
}
