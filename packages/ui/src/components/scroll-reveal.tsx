'use client';

import * as React from 'react';
import { motion, useInView, type Variants, type UseInViewOptions } from 'framer-motion';
import { fadeUp } from '../lib/animations';

type ScrollMargin = UseInViewOptions['margin'];

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  variants?: Variants;
  className?: string;
  once?: boolean;
  margin?: ScrollMargin;
}

export function ScrollReveal({
  children,
  delay = 0,
  variants = fadeUp,
  className,
  once = true,
  margin = '-100px' as ScrollMargin,
}: ScrollRevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once, margin });

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
