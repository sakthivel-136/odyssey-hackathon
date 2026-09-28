'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Animated Ambient Background with drifting mesh-gradient blobs
 * and subtle medical cross / capsule floating particles.
 * 100% accessible: disables motion if prefers-reduced-motion is true.
 */
export function AnimatedBackground() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 pointer-events-none -z-10 bg-slate-50" />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-slate-50">
      {/* 1. Large Blurred Mesh Blobs */}
      {!prefersReduced ? (
        <>
          {/* Blob 1: Blue brand */}
          <motion.div
            animate={{
              x: [0, 80, -40, 0],
              y: [0, -60, 40, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-32 -left-32 w-96 md:w-[36rem] h-96 md:h-[36rem] rounded-full bg-blue-500/15 blur-[100px]"
          />

          {/* Blob 2: Emerald Verified */}
          <motion.div
            animate={{
              x: [0, -90, 50, 0],
              y: [0, 70, -50, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            className="absolute top-1/4 -right-32 w-96 md:w-[32rem] h-96 md:h-[32rem] rounded-full bg-emerald-400/12 blur-[110px]"
          />

          {/* Blob 3: Sky Accent */}
          <motion.div
            animate={{
              x: [0, 60, -70, 0],
              y: [0, -80, 60, 0],
              scale: [0.95, 1.1, 1, 0.95],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 4,
            }}
            className="absolute -bottom-32 left-1/3 w-80 md:w-[30rem] h-80 md:h-[30rem] rounded-full bg-sky-300/15 blur-[90px]"
          />

          {/* Blob 4: Soft Indigo Tint */}
          <motion.div
            animate={{
              x: [0, -40, 60, 0],
              y: [0, 50, -40, 0],
            }}
            transition={{
              duration: 26,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="absolute top-2/3 -left-20 w-72 md:w-[26rem] h-72 md:h-[26rem] rounded-full bg-indigo-400/10 blur-[90px]"
          />
        </>
      ) : (
        /* Static ambient gradients for reduced motion */
        <>
          <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute top-1/4 -right-32 w-[28rem] h-[28rem] rounded-full bg-emerald-400/10 blur-[110px]" />
          <div className="absolute -bottom-32 left-1/3 w-[26rem] h-[26rem] rounded-full bg-sky-300/10 blur-[90px]" />
        </>
      )}

      {/* 2. Floating Subtle Medical Particle Shapes (~5% opacity drifting upward) */}
      {!prefersReduced && (
        <div className="absolute inset-0 overflow-hidden opacity-5">
          {/* Medical Cross 1 */}
          <motion.div
            initial={{ y: '110vh', x: '15vw' }}
            animate={{ y: '-10vh' }}
            transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
            className="absolute"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-slate-900">
              <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
            </svg>
          </motion.div>

          {/* Medical Pill Capsule 1 */}
          <motion.div
            initial={{ y: '115vh', x: '45vw', rotate: 25 }}
            animate={{ y: '-10vh', rotate: 65 }}
            transition={{ duration: 38, repeat: Infinity, ease: 'linear', delay: 6 }}
            className="absolute"
          >
            <div className="w-6 h-12 rounded-full border-2 border-slate-900 flex flex-col items-center">
              <div className="w-full h-1/2 border-b border-slate-900" />
            </div>
          </motion.div>

          {/* Medical Cross 2 */}
          <motion.div
            initial={{ y: '110vh', x: '75vw' }}
            animate={{ y: '-10vh' }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear', delay: 12 }}
            className="absolute"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-slate-900">
              <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
            </svg>
          </motion.div>

          {/* Medical Pill Capsule 2 */}
          <motion.div
            initial={{ y: '120vh', x: '88vw', rotate: -35 }}
            animate={{ y: '-10vh', rotate: 15 }}
            transition={{ duration: 42, repeat: Infinity, ease: 'linear', delay: 18 }}
            className="absolute"
          >
            <div className="w-5 h-10 rounded-full border-2 border-slate-900 flex flex-col items-center">
              <div className="w-full h-1/2 border-b border-slate-900" />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
