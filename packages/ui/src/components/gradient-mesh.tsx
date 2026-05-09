'use client';

import { cn } from '../lib/utils';

interface GradientMeshProps {
  className?: string;
  variant?: 'subtle' | 'vibrant';
}

export function GradientMesh({ className, variant = 'subtle' }: GradientMeshProps) {
  const opacity = variant === 'subtle' ? 'opacity-30' : 'opacity-60';

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none', className)}>
      <div
        className={cn(
          'absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-primary/40 mix-blend-multiply blur-3xl animate-blob',
          opacity,
        )}
      />
      <div
        className={cn(
          'absolute top-1/3 -right-40 h-[40rem] w-[40rem] rounded-full bg-accent/40 mix-blend-multiply blur-3xl animate-blob animation-delay-2000',
          opacity,
        )}
      />
      <div
        className={cn(
          'absolute bottom-0 left-1/3 h-[40rem] w-[40rem] rounded-full bg-info/40 mix-blend-multiply blur-3xl animate-blob animation-delay-4000',
          opacity,
        )}
      />
    </div>
  );
}
