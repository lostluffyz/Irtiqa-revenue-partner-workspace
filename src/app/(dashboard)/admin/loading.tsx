import { Skeleton, SkeletonText, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Admin segment loading UI.
 *
 * Rendered by Next.js as the Suspense fallback during client-side
 * navigation to ANY /admin route. Mirrors the dashboard layout
 * (hero + action buttons + KPI cards + compliance + table) inside the
 * SAME shared page container, so there is no layout jump when content loads.
 */
export default function AdminLoading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Loading admin content">
      {/* Hero + action buttons */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 rounded-[var(--radius-sm)]" style={{ width: "260px" }} />
          <SkeletonText lines={1} className="max-w-md" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[32px] rounded-[8px]" style={{ width: i < 2 ? "110px" : "130px" }} />
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dl-surface p-4">
            <Skeleton className="h-8 w-8 rounded-[8px]" />
            <div className="mt-3">
              <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
            </div>
            <div className="mt-2">
              <SkeletonText lines={1} />
            </div>
          </div>
        ))}
      </div>

      {/* Compliance block */}
      <div className="dl-surface p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 rounded-[var(--radius-sm)]" style={{ width: "160px" }} />
          <Skeleton className="h-7 w-16 rounded-[var(--radius-sm)]" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-1.5 rounded-full" />
        </div>
      </div>

      {/* Table */}
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
