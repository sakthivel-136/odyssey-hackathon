'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import React from 'react';
import { SPRING_SNAPPY, TAP_SCALE } from './motion-config';

interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
}

export function MotionButton({
  loading = false,
  success = false,
  error = false,
  children,
  variant = 'primary',
  className = '',
  disabled,
  onClick,
  ...props
}: MotionButtonProps) {
  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  }[variant];

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : TAP_SCALE }}
      whileHover={{ y: disabled || loading ? 0 : -1 }}
      animate={
        error
          ? { x: [-6, 6, -4, 4, 0] }
          : success
          ? { scale: [1, 1.04, 1] }
          : {}
      }
      transition={SPRING_SNAPPY}
      disabled={disabled || loading}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center font-bold text-sm px-5 py-3 rounded-2xl transition-colors min-h-[44px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles} ${className}`}
      {...props as any}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
          >
            {/* Heartbeat 3-dot pulse */}
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: dot * 0.18,
                }}
                className="w-2 h-2 rounded-full bg-current"
              />
            ))}
          </motion.div>
        ) : success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-1.5 text-emerald-400"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Success</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-1.5 text-white"
          >
            <X className="w-5 h-5 stroke-[3]" />
            <span>Error</span>
          </motion.div>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
