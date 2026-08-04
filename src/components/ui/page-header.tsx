import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * PageHeader — Consistent page header across all admin pages.
 *
 * Usage:
 *   <PageHeader
 *     title="Partners"
 *     description="Manage your revenue partner network."
 *     action={<Button>Add Partner</Button>}
 *   />
 *
 * Design tokens: --type-display, --type-body, --sp-6, --sp-8
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="dl-type-display">{title}</h1>
        {description && (
          <p className="mt-1 dl-type-body text-[var(--text-2)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
