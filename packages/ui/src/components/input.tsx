'use client';

import * as React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const inputVariants = cva(
  [
    // 16px on mobile (Safari iOS won't trigger zoom-on-focus below 16px),
    // 14px from md up — keeps the desktop visual rhythm intact.
    'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base md:text-sm',
    'ring-offset-background',
    'transition-[border-color,box-shadow] duration-ui ease-apple',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      state: {
        default: 'border-input hover:border-primary/50',
        error: 'border-error focus-visible:ring-error',
        success: 'border-success focus-visible:ring-success',
      },
    },
    defaultVariants: { state: 'default' },
  },
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, state, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ state }), className)}
        ref={ref}
        aria-invalid={state === 'error' || undefined}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

/* ------------------------------------------------------------------ */
/* FloatingInput — auth/checkout molecule (Apple-grade floating label) */
/* ------------------------------------------------------------------ */

export interface FloatingInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  error?: string;
  success?: boolean;
  hint?: string;
  /** Optional leading icon (Lucide component). */
  icon?: React.ComponentType<{ className?: string }>;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, success, hint, icon: Icon, className, id, type = 'text', required, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? `flt-${reactId}`;
    const descId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
    const state = error ? 'error' : success ? 'success' : 'default';

    return (
      <div className={cn('w-full', className)}>
        <div className="relative">
          {Icon ? (
            <Icon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            placeholder=" "
            aria-invalid={state === 'error' || undefined}
            aria-describedby={descId}
            className={cn(
              // 16px on mobile prevents Safari iOS auto-zoom on focus.
              'peer flex h-14 w-full rounded-md border bg-background px-3 pt-5 pb-1.5 text-base md:text-sm',
              'ring-offset-background transition-[border-color,box-shadow] duration-ui ease-apple',
              'placeholder:text-transparent',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              Icon && 'pl-10',
              state === 'default' && 'border-input hover:border-primary/50',
              state === 'error' && 'border-error focus-visible:ring-error',
              state === 'success' && 'border-success focus-visible:ring-success pr-10',
            )}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute left-3 z-[1] origin-[0]',
              'text-muted-foreground text-sm',
              'transition-[transform,color] duration-ui ease-apple',
              Icon && 'left-10',
              // Default position (no value, not focused): center
              'top-1/2 -translate-y-1/2',
              // Filled or focused: shrink + lift
              'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-primary',
              'peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]',
              state === 'error' && 'peer-focus:text-error peer-[:not(:placeholder-shown)]:text-error',
              state === 'success' && 'peer-focus:text-success peer-[:not(:placeholder-shown)]:text-success',
            )}
          >
            {label}
            {required ? <span className="ml-0.5 text-error">*</span> : null}
          </label>
          {state === 'success' ? (
            <Check
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-success"
              aria-hidden
            />
          ) : null}
          {state === 'error' ? (
            <AlertCircle
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-error"
              aria-hidden
            />
          ) : null}
        </div>
        {error ? (
          /* UIUX-012: announce validation errors to screen readers as they
             appear (role=alert → assertive live region). */
          <p
            id={descId}
            role="alert"
            aria-live="polite"
            className="mt-1.5 flex items-center gap-1 text-xs text-error"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={descId} className="mt-1.5 text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
FloatingInput.displayName = 'FloatingInput';

export { Input, FloatingInput, inputVariants };
