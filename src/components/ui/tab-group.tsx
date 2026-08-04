"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { TAB_TRANSITION, REDUCED_MOTION_TRANSITION } from "@/lib/animations";

interface TabOption {
  value: string;
  label: string;
  count?: number;
}

interface TabGroupProps {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * TabGroup — Animated tab bar with layoutId sliding underline indicator.
 *
 * Uses Framer Motion's layoutId for smooth, automatic indicator animation
 * between tabs. No ref measurement or resize listeners needed.
 *
 * Design tokens: --type-caption, --accent, --border-subtle
 */
export function TabGroup({ options, value, onChange }: TabGroupProps) {
  const prefersReduced = useReducedMotion();

  return (
    <LayoutGroup>
      <div className="relative flex items-center gap-0">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              dl-focus-ring relative px-3 py-2 dl-type-caption
              transition-colors duration-150
              ${value === opt.value
                ? "text-[var(--text-1)] font-semibold"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }
            `}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`ml-1.5 ${value === opt.value ? "text-[var(--text-2)]" : "text-[var(--text-3)]"}`}>
                ({opt.count})
              </span>
            )}
            {value === opt.value && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full"
                transition={
                  prefersReduced ? REDUCED_MOTION_TRANSITION : TAB_TRANSITION
                }
              />
            )}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
