'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface NumberCountUpProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * Accessible number count-up component
 * Animates integer / float count-up smoothly over specified duration.
 */
export function NumberCountUp({
  to,
  duration = 1.2,
  suffix = '',
  prefix = '',
  className = '',
}: NumberCountUpProps) {
  const prefersReduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(prefersReduced ? to : 0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(to);
      return;
    }

    let start = 0;
    const end = to;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const totalSteps = 45;
    const stepTime = (duration * 1000) / totalSteps;
    const stepIncrement = (end - start) / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        start += stepIncrement;
        setDisplayValue(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [to, duration, prefersReduced]);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
