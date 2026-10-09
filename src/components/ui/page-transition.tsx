"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { REDUCED_MOTION_TRANSITION } from "@/lib/animations";

/**
 * PageTransition — subtle fade wrapper for route transitions.
 *
 * Wraps {children} inside each shell. Only triggers on pathname changes —
 * search params, filter changes, pagination, form typing, and component
 * state updates do NOT trigger transitions.
 *
 * Uses the default (sync) AnimatePresence mode so the incoming page
 * cross-fades with the outgoing page. mode="wait" MUST NOT be used here:
 * it unmounts the old page before the new page's RSC stream resolves,
 * leaving the content area blank (with zero Suspense fallback) on slow
 * navigations until a manual refresh.
 * Respects prefers-reduced-motion by setting duration to 0.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={
          prefersReduced
            ? REDUCED_MOTION_TRANSITION
            : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
