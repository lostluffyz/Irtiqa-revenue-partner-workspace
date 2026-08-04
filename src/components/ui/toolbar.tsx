import type { ReactNode } from "react";

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Toolbar — Container for search + filter controls.
 *
 * Provides consistent spacing and alignment for toolbar items.
 * The search takes remaining space, filters align to the right.
 *
 * Design tokens: --sp-3, --sp-4
 */
export function Toolbar({ children, className = "" }: ToolbarProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}

interface ToolbarSearchProps {
  children: ReactNode;
  className?: string;
}

/**
 * ToolbarSearch — Wraps the search input to take remaining space.
 */
export function ToolbarSearch({ children, className = "" }: ToolbarSearchProps) {
  return (
    <div className={`flex-1 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

interface ToolbarFiltersProps {
  children: ReactNode;
  className?: string;
}

/**
 * ToolbarFilters — Wraps filter controls, right-aligned.
 */
export function ToolbarFilters({ children, className = "" }: ToolbarFiltersProps) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      {children}
    </div>
  );
}
