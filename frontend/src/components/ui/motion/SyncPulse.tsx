'use client';

import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface SyncPulseProps {
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | string;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SyncPulse({
  status,
  label,
  showIcon = true,
  size = 'md',
}: SyncPulseProps) {
  const isOnline = status === 'ONLINE';
  const isSyncing = status === 'SYNCING';

  const colorClass = isOnline
    ? 'bg-emerald-500 text-emerald-600 border-emerald-200'
    : isSyncing
    ? 'bg-blue-500 text-blue-600 border-blue-200'
    : 'bg-red-500 text-red-600 border-red-200';

  const ringColor = isOnline
    ? 'rgba(16, 185, 129, 0.35)'
    : isSyncing
    ? 'rgba(37, 99, 235, 0.35)'
    : 'rgba(239, 68, 68, 0.35)';

  const sizeStyles = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5">
      {/* Radar Pulse Center */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing Concentric Ripple Rings */}
        {(isOnline || isSyncing) && (
          <motion.span
            animate={{
              scale: [1, 2.2, 2.6],
              opacity: [0.8, 0.2, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{ backgroundColor: ringColor }}
            className={`absolute rounded-full ${sizeStyles}`}
          />
        )}
        <span className={`relative rounded-full ${sizeStyles} ${colorClass.split(' ')[0]}`} />
      </div>

      {/* Optional Icon & Text Label */}
      <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
        {showIcon && (
          isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          ) : isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-500" />
          )
        )}
        <span className={isOnline ? 'text-slate-900' : isSyncing ? 'text-blue-600' : 'text-red-600'}>
          {label || status}
        </span>
      </div>
    </div>
  );
}
