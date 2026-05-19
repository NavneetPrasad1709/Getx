'use client';

import * as React from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@getx/ui';

/* SlideToUnlock — slide-to-reveal reward card.
 *
 * Used post-payment to celebrate a successful order. The user drags a
 * handle right; past 80% the gift content swaps in with confetti
 * underneath. Adapted from the 21st.dev pattern but rewired for our
 * tokens (bg-surface, bg-secondary) and our cn helper.
 */

interface SlideToUnlockProps {
  children: React.ReactNode;
  onUnlock: () => void;
  sliderText?: string;
  unlockedContent: React.ReactNode;
  className?: string;
  shimmer?: boolean;
}

export function SlideToUnlock({
  children,
  onUnlock,
  sliderText = 'Slide to claim your reward',
  unlockedContent,
  className,
  shimmer = true,
}: SlideToUnlockProps) {
  const [unlocked, setUnlocked] = React.useState(false);
  const [dragConstraint, setDragConstraint] = React.useState(0);
  const x = useMotionValue(0);

  const sliderRef = React.useRef<HTMLDivElement>(null);
  const handleRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const measure = () => {
      const sliderWidth = sliderRef.current?.offsetWidth ?? 0;
      const handleWidth = handleRef.current?.offsetWidth ?? 0;
      setDragConstraint(Math.max(0, sliderWidth - handleWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const onDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > dragConstraint * 0.8) {
      setUnlocked(true);
      onUnlock();
    } else {
      x.set(0);
    }
  };

  const textOpacity = useTransform(x, [0, 50], [1, 0]);

  return (
    <div
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-2xl border bg-surface p-6 text-foreground shadow-lg',
        className,
      )}
    >
      {children}
      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="slider"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative mt-6"
          >
            <div
              ref={sliderRef}
              className="relative h-14 w-full overflow-hidden rounded-full bg-muted/30"
            >
              <motion.div
                ref={handleRef}
                drag="x"
                dragConstraints={{ left: 0, right: dragConstraint }}
                dragElastic={0.1}
                style={{ x }}
                onDragEnd={onDragEnd}
                className="absolute left-0 top-0 z-10 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:cursor-grabbing"
                role="slider"
                aria-label="Slide to claim reward"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
              >
                <ChevronRight className="h-6 w-6" />
              </motion.div>
              <motion.span
                style={{ opacity: textOpacity }}
                className={cn(
                  'pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground',
                  shimmer &&
                    'animate-shimmer bg-[linear-gradient(110deg,hsl(var(--muted-foreground)),45%,hsl(var(--foreground)),55%,hsl(var(--muted-foreground)))] bg-[length:200%_100%] bg-clip-text text-transparent',
                )}
              >
                {sliderText}
              </motion.span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {unlockedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
