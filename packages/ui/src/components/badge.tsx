import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    'transition-colors duration-ui ease-apple',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover',
        accent: 'border-transparent bg-accent text-accent-foreground hover:bg-accent-hover',
        secondary: 'border-transparent bg-muted/20 text-foreground hover:bg-muted/30',
        destructive: 'border-transparent bg-error text-white hover:bg-error/90',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/90',
        outline: 'text-foreground border-border',
        // Live — crimson with pulse dot, for "live deals", "342 trading now"
        live: 'border-transparent bg-hot/15 text-hot ring-1 ring-hot/30',
        // Hot — solid crimson, for fire deals
        hot: 'border-transparent bg-hot text-hot-foreground hover:bg-hot-hover',
        // New — cyan tint, for new listings/features
        new: 'border-transparent bg-primary/15 text-primary ring-1 ring-primary/30',
        // Sale — amber/crimson sweep, for discounts
        sale: 'border-transparent text-white bg-gradient-to-r from-hot to-accent',
        // Verified — mint with shield, for KYC sellers
        verified: 'border-transparent bg-success/15 text-success ring-1 ring-success/30',
        // Premium — rockstar amber, for featured/promoted listings
        premium: 'border-transparent bg-accent/15 text-accent ring-1 ring-accent/40',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Show a leading status dot. `live` pulses. */
  dot?: boolean | 'live';
  /** Show a leading icon — auto-injected for `verified` + `premium` variants if omitted. */
  icon?: React.ComponentType<{ className?: string }>;
}

function Badge({ className, variant, size, dot, icon: Icon, children, ...props }: BadgeProps) {
  // Auto-icons for trust-signal variants
  const AutoIcon =
    Icon ??
    (variant === 'verified' ? ShieldCheck : variant === 'premium' ? Sparkles : undefined);

  // `live` variant auto-adds pulsing dot if not explicitly set
  const effectiveDot = dot ?? (variant === 'live' ? 'live' : false);

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {effectiveDot ? (
        <span className="relative flex size-1.5">
          {effectiveDot === 'live' ? (
            <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-current opacity-60" />
          ) : null}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {AutoIcon ? <AutoIcon className="size-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
