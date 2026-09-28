'use client';

import { motion } from 'framer-motion';
import { NumberCountUp } from './NumberCountUp';

interface AdherenceRingProps {
  percentage: number;
  status?: 'ON_TRACK' | 'LOW_STOCK' | 'MISSED' | string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function AdherenceRing({
  percentage = 100,
  status = 'ON_TRACK',
  size = 120,
  strokeWidth = 10,
  label = 'Adherence',
}: AdherenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  // Determine status color gradient & glow
  const isMissed = status === 'MISSED' || percentage < 75;
  const isLowStock = status === 'LOW_STOCK' || (percentage >= 75 && percentage < 90);

  const gradientId = `ring-gradient-${status}`;
  const strokeColor = isMissed
    ? '#EF4444'
    : isLowStock
    ? '#F59E0B'
    : '#10B981';

  const glowClass = isMissed
    ? 'shadow-red-500/20'
    : isLowStock
    ? 'shadow-amber-500/20'
    : 'shadow-emerald-500/25';

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div className={`relative rounded-full p-2 shadow-xl ${glowClass}`}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isMissed ? '#F87171' : isLowStock ? '#FBBF24' : '#34D399'} />
              <stop offset="100%" stopColor={strokeColor} />
            </linearGradient>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100"
            fill="transparent"
          />

          {/* Animated Value Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            <NumberCountUp to={percentage} suffix="%" />
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
