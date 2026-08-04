"use client";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MobileSectionCard({ title, subtitle, action, children, className = "" }: SectionCardProps) {
  return (
    <div className={`mobile-section-card ${className}`}>
      {(title || action) && (
        <div className="mobile-section-header">
          {title && (
            <div>
              <h2 className="mobile-section-title">{title}</h2>
              {subtitle && <p className="text-[13px] text-[var(--text-3)] mt-0.5">{subtitle}</p>}
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="mobile-section-body">
        {children}
      </div>
    </div>
  );
}
