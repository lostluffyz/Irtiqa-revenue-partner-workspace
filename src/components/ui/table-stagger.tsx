"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TABLE_ROW_STAGGER, TABLE_ROW, REDUCED_MOTION_TRANSITION } from "@/lib/animations";

/* ═══════════════════════════════════════════════════════════════
   TableStaggerGroup — tbody wrapper that staggers row entrance
   ═══════════════════════════════════════════════════════════════ */

interface TableStaggerGroupProps {
  children: ReactNode;
  className?: string;
}

export function TableStaggerGroup({ children, className = "" }: TableStaggerGroupProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.tbody
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: prefersReduced ? 0 : TABLE_ROW_STAGGER,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.tbody>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AnimatedTableRow — Individual <tr> that fades in
   ═══════════════════════════════════════════════════════════════ */

interface AnimatedTableRowProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedTableRow({ children, className = "" }: AnimatedTableRowProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.tr
      variants={{
        hidden: TABLE_ROW.hidden,
        visible: TABLE_ROW.visible,
      }}
      transition={prefersReduced ? REDUCED_MOTION_TRANSITION : TABLE_ROW.transition}
      className={className}
    >
      {children}
    </motion.tr>
  );
}
