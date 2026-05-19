'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    'ring-offset-background',
    'transition-all duration-ui ease-apple',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Rockstar-grade: solid yellow on black-text, sharp, no colored glow.
        default:
          'bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary-hover',
        accent:
          'bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary-hover',
        destructive: 'bg-hot text-hot-foreground font-bold uppercase tracking-wider hover:bg-hot-hover',
        outline:
          'border border-foreground/40 bg-transparent text-foreground hover:bg-foreground hover:text-background hover:border-foreground',
        secondary: 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80',
        ghost: 'hover:bg-surface-elevated hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient: 'bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary-hover',
        hot: 'bg-hot text-hot-foreground font-bold uppercase tracking-wider hover:bg-hot-hover',
        premium:
          'bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary-hover',
        success:
          'bg-success text-success-foreground font-bold uppercase tracking-wider hover:bg-success/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-base font-semibold tracking-wide',
        icon: 'h-10 w-10',
        'icon-sm': 'h-9 w-9',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, loadingText, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          aria-disabled={isDisabled || undefined}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
