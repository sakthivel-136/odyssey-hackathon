'use client';

import { motion } from 'framer-motion';
import { Pill, BellRing, CalendarClock, History } from 'lucide-react';
import Link from 'next/link';
import { MotionButton } from './ButtonLoader';

interface EmptyStateProps {
  type?: 'medicines' | 'schedules' | 'notifications' | 'history';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  type = 'medicines',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const icons = {
    medicines: Pill,
    notifications: BellRing,
    schedules: CalendarClock,
    history: History,
  };

  const Icon = icons[type] || Pill;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-10 md:p-14 text-center max-w-lg mx-auto shadow-sm"
    >
      {/* Floating Animated Icon Container */}
      <motion.div
        animate={{
          y: [-4, 6, -4],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-sm"
      >
        <Icon className="w-8 h-8 text-blue-600" />
      </motion.div>

      <h3 className="text-xl font-black text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6 max-w-sm mx-auto">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <MotionButton variant="primary">
            {actionLabel}
          </MotionButton>
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <MotionButton variant="primary" onClick={onAction}>
          {actionLabel}
        </MotionButton>
      )}
    </motion.div>
  );
}
