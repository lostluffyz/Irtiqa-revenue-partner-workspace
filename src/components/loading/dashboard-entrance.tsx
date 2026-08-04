"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { REDUCED_MOTION_TRANSITION } from "@/lib/animations";

/* ═══════════════════════════════════════════════════════════════
   DashboardEntrance — Staggered fade-in wrapper for dashboard content.
   ═══════════════════════════════════════════════════════════════ */

interface EntranceProps {
  children: ReactNode;
  /** Delay in ms before this element starts animating */
  delay?: number;
  /** CSS class to apply */
  className?: string;
}

export function DashboardEntrance({ children, delay = 0, className = "" }: EntranceProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReduced
          ? REDUCED_MOTION_TRANSITION
          : { duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

DashboardEntrance.displayName = "DashboardEntrance";

/**
 * Pre-configured entrance sections with standard delays.
 */
DashboardEntrance.Header = function HeaderEntrance({ children, className = "" }: Omit<EntranceProps, "delay">) {
  return <DashboardEntrance delay={0} className={className}>{children}</DashboardEntrance>;
};

DashboardEntrance.Cards = function CardsEntrance({ children, className = "" }: Omit<EntranceProps, "delay">) {
  return <DashboardEntrance delay={50} className={className}>{children}</DashboardEntrance>;
};

DashboardEntrance.Content = function ContentEntrance({ children, className = "" }: Omit<EntranceProps, "delay">) {
  return <DashboardEntrance delay={100} className={className}>{children}</DashboardEntrance>;
};

DashboardEntrance.Tables = function TablesEntrance({ children, className = "" }: Omit<EntranceProps, "delay">) {
  return <DashboardEntrance delay={150} className={className}>{children}</DashboardEntrance>;
};

DashboardEntrance.Charts = function ChartsEntrance({ children, className = "" }: Omit<EntranceProps, "delay">) {
  return <DashboardEntrance delay={200} className={className}>{children}</DashboardEntrance>;
};
