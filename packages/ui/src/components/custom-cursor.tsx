'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  const springConfig = { damping: 25, stiffness: 700, mass: 0.5 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
      setIsVisible(true);
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener('mousemove', moveCursor);

    const interactiveSelector =
      'a, button, [role="button"], input, textarea, select, [data-cursor-hover]';
    const interactives = Array.from(document.querySelectorAll(interactiveSelector));
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    const observer = new MutationObserver(() => {
      const fresh = Array.from(document.querySelectorAll(interactiveSelector));
      fresh.forEach((el) => {
        if (!interactives.includes(el)) {
          el.addEventListener('mouseenter', handleMouseEnter);
          el.addEventListener('mouseleave', handleMouseLeave);
          interactives.push(el);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      observer.disconnect();
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <motion.div
      style={{ translateX: x, translateY: y }}
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:block"
      animate={{ scale: isHovering ? 2.5 : 1, opacity: isHovering ? 0.4 : 0.7 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
    >
      <div className="h-8 w-8 rounded-full border-2 border-primary mix-blend-difference" />
    </motion.div>
  );
}
