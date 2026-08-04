import type { ReactNode } from "react";

interface DataCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * DataCard — Card-based list item for homogeneous data rows.
 *
 * Design language: Attio/Linear-inspired list item.
 * Each card is a flex row with consistent padding and border.
 * Not an HTML table — a card-based layout that scales well on mobile.
 *
 * Design tokens: --radius-md, --shadow-1 (resting), --shadow-2 (hover)
 * Hover: subtle shadow increase, no translate or scale.
 */
export function DataCard({ children, onClick, className = "" }: DataCardProps) {
  return (
    <div
      className={`
        dl-surface dl-surface-hover
        flex items-center gap-4 px-4 py-3
        transition-colors duration-150
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface DataCardColumnProps {
  children: ReactNode;
  primary?: boolean;
  className?: string;
}

/**
 * DataCardColumn — A column within a DataCard.
 * primary=true gives it full width (flex-1).
 */
export function DataCardColumn({ children, primary = false, className = "" }: DataCardColumnProps) {
  return (
    <div className={`${primary ? "flex-1 min-w-0" : ""} ${className}`}>
      {children}
    </div>
  );
}

interface DataCardActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * DataCardActions — Right-aligned actions container.
 * Hidden by default, shown on parent hover via group-hover.
 */
export function DataCardActions({ children, className = "" }: DataCardActionsProps) {
  return (
    <div className={`flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${className}`}>
      {children}
    </div>
  );
}
