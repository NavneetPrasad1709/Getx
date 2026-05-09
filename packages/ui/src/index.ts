// Primitives
export * from './components/button';
export * from './components/card';
export * from './components/input';
export * from './components/textarea';
export * from './components/label';
export * from './components/badge';
export * from './components/skeleton';
export * from './components/tooltip';
export * from './components/dialog';
export * from './components/popover';
export * from './components/dropdown-menu';
export * from './components/tabs';
export * from './components/select';
export * from './components/avatar';
export * from './components/toaster';

// Custom premium
export * from './components/magnetic-button';
export * from './components/gradient-mesh';
export * from './components/scroll-reveal';
export * from './components/custom-cursor';
export * from './components/page-transition';
export * from './components/theme-provider';
export * from './components/theme-toggle';

// Lib
export * from './lib/utils';
export * from './lib/animations';

// Re-exports so apps don't need direct deps
export { motion, AnimatePresence, useInView, useMotionValue, useSpring } from 'framer-motion';
export type { Variants, MotionProps, UseInViewOptions } from 'framer-motion';
