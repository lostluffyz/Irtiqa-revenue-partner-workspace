"use client";

import { useEffect, useState } from "react";
import { useSpring, useTransform, useReducedMotion } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * AnimatedNumber — Smooth count-up for KPI/stat values.
 *
 * Uses motion's useSpring to interpolate between old and new values.
 * Only animates when the value actually changes.
 * Respects prefers-reduced-motion by setting duration to 0.
 */
export function AnimatedNumber({ value, duration = 0.4, className = "" }: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const spring = useSpring(0, {
    duration: prefersReduced ? 0 : duration * 1000,
    bounce: 0,
  });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const [displayValue, setDisplayValue] = useState(value.toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}
