import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div className={`surface ${hover ? "surface-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--border-subtle)]">
      <div>
        <h3 className="text-[14px] font-semibold text-[var(--text-1)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[13px] text-[var(--text-3)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-[14px] font-semibold text-[var(--text-1)] ${className}`}>
      {children}
    </h3>
  );
}
