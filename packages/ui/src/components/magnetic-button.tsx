'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../lib/utils';
import { buttonVariants, type ButtonProps } from './button';

export interface MagneticButtonProps extends Omit<ButtonProps, 'asChild'> {
  strength?: number;
}

const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ className, variant, size, strength = 0.3, children, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLButtonElement | null>(null);

    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLButtonElement, []);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const node = innerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * strength);
      y.set((e.clientY - centerY) * strength);
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    const {
      onAnimationStart: _onAnimationStart,
      onDragStart: _onDragStart,
      onDragEnd: _onDragEnd,
      onDrag: _onDrag,
      ...buttonProps
    } = props;

    return (
      <motion.button
        ref={innerRef}
        style={{ x: springX, y: springY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(buttonVariants({ variant, size }), className)}
        {...buttonProps}
      >
        {children}
      </motion.button>
    );
  },
);
MagneticButton.displayName = 'MagneticButton';

export { MagneticButton };
