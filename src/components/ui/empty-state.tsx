import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * EmptyState — Centered empty state with icon, title, description, and action.
 *
 * Design language: Consistent across all admin pages.
 * Two variants handled by the consumer:
 *   - No data: "No partners yet" + "Add Partner" CTA
 *   - No results: "No matches" + "Clear Filters" CTA
 *
 * Design tokens: --type-title, --type-body, --sp-4
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 text-[var(--text-3)] opacity-30">
          {icon}
        </div>
      )}
      <h3 className="dl-type-title">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm dl-type-body text-[var(--text-3)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
