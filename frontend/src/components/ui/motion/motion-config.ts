import { useReducedMotion } from 'framer-motion';

/**
 * Standard healthcare-grade spring physics & transitions
 * Engineered for responsive, smooth micro-interactions at 60fps
 */

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  damping: 26,
  stiffness: 320,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 200,
};

export const SPRING_BOUNCY = {
  type: 'spring' as const,
  damping: 18,
  stiffness: 260,
};

export const SPRING_DRAWER = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 250,
};

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_SMOOTH = [0.25, 0.1, 0.25, 1.0] as const;

export const TAP_SCALE = 0.97;
export const HOVER_LIFT_Y = -3;

/**
 * Staggered entrance variants for list containers
 */
export const staggerContainer = (staggerDelay = 0.05, delayChildren = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING_GENTLE,
  },
};

export const scaleFadeIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING_SNAPPY,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.18 },
  },
};

export const slideInRight = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: SPRING_DRAWER,
  },
  exit: {
    x: '100%',
    transition: { duration: 0.22, ease: 'easeInOut' as const },
  },
};

/**
 * Hook to check if user has requested reduced motion
 */
export function useMotionSafe() {
  const prefersReduced = useReducedMotion();
  return {
    prefersReduced,
    spring: prefersReduced ? { duration: 0 } : SPRING_SNAPPY,
    gentle: prefersReduced ? { duration: 0 } : SPRING_GENTLE,
  };
}
