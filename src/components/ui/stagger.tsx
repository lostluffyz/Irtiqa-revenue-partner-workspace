"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { STAGGER_CHILDREN, STAGGER_ITEM, REDUCED_MOTION_TRANSITION } from "@/lib/animations";

/* ═══════════════════════════════════════════════════════════════
   StaggerGroup — Container that staggers children entrance
   ═══════════════════════════════════════════════════════════════ */

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds before stagger begins (default: 0) */
  delay?: number;
}

export function StaggerGroup({ children, className = "", delay = 0 }: StaggerGroupProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: prefersReduced ? 0 : STAGGER_CHILDREN,
            delayChildren: prefersReduced ? 0 : delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   StaggerItem — Individual animated child
   ═══════════════════════════════════════════════════════════════ */

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: STAGGER_ITEM.hidden,
        visible: STAGGER_ITEM.visible,
      }}
      transition={prefersReduced ? REDUCED_MOTION_TRANSITION : STAGGER_ITEM.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
