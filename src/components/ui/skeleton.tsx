import type { CSSProperties, ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Skeleton — Loading placeholder with shimmer animation.
 *
 * Design language: Skeletons match the exact layout of final content.
 * Uses dl-skeleton class for consistent shimmer across all pages.
 *
 * Animation: Left-to-right sweep, 1.5s cycle, ease-in-out.
 */
export function Skeleton({ className = "", style, children }: SkeletonProps) {
  return (
    <div className={`dl-skeleton ${className}`} style={style} aria-hidden={!children}>
      {children}
    </div>
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="dl-skeleton h-3.5 rounded-[var(--radius-sm)]"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`dl-surface p-4 ${className}`} aria-hidden>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-8 w-8 rounded-[var(--radius-sm)]" />
        <SkeletonText lines={1} className="flex-1" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="dl-surface overflow-hidden" aria-hidden>
      <div className="border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--hover-bg)]">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 rounded-[var(--radius-sm)]" style={{ width: `${100 / cols}%` }} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-6 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-3.5 rounded-[var(--radius-sm)]"
              style={{ width: col === 0 ? "30%" : `${Math.max(15, 70 / cols)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
