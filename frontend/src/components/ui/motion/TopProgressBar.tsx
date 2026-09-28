'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Thin animated top route progress bar with blue-600 gradient
 * Triggers seamlessly on Next.js pathname changes.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {animating && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-500 shadow-sm shadow-blue-500/30"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
