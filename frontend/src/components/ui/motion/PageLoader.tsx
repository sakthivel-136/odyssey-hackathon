'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { SPRING_GENTLE } from './motion-config';

/**
 * Branded full-screen splash/app-load:
 * Logo scales in, a pill capsule splits and fills with blue-to-emerald gradient,
 * and text provides gentle progress feedback.
 */
export function PageLoader({ message = 'Synchronizing Medibox...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING_GENTLE}
        className="flex flex-col items-center"
      >
        {/* Brand Icon Box */}
        <div className="relative mb-6">
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(37, 99, 235, 0.4)',
                '0 0 0 20px rgba(37, 99, 235, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30"
          >
            <Activity className="w-8 h-8 text-white" />
          </motion.div>
        </div>

        {/* Splitting & Filling Pill Capsule Animation */}
        <div className="relative w-28 h-10 rounded-full border-2 border-blue-500/40 p-1 flex items-center overflow-hidden mb-6 bg-white/80 shadow-inner">
          {/* Capsule Left Cap */}
          <motion.div
            animate={{
              width: ['0%', '100%'],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500"
          />
        </div>

        {/* Brand & Loading Label */}
        <motion.h2
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-black tracking-tight text-slate-900"
        >
          Smart Medibox
        </motion.h2>
        <p className="text-sm font-semibold text-slate-500 mt-1">{message}</p>
      </motion.div>
    </div>
  );
}
