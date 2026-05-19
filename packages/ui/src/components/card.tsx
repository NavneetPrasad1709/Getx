import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const cardVariants = cva('rounded-lg text-foreground transition-all duration-ui ease-apple', {
  variants: {
    variant: {
      // Original default — preserved so existing call-sites keep their look
      default:
        'border border-border bg-surface shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      // Cinematic — Rockstar-grade. Cyan rim glow + soft gradient interior. Use for hero + premium listings.
      cinematic: 'surface-cinematic',
      // Bento — for marketing grids. Art zooms on hover, no padding by default (caller controls media).
      bento:
        'relative overflow-hidden border border-border bg-surface shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:border-primary/40 [&_img]:transition-transform [&_img]:duration-section [&_img]:ease-apple hover:[&_img]:scale-[1.04]',
      // Glass — translucent, for overlays on cinematic backgrounds
      glass: 'glass shadow-lg hover:shadow-xl',
      // Flat — no hover lift, for dense data sections (dashboard, admin)
      flat: 'border border-border bg-surface',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-display text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
