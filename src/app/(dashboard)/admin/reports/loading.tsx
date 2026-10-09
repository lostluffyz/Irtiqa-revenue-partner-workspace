import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Admin reports loading UI — mirrors the page layout (header, filter
 * card, four tiles, table rows / mobile cards) in the same container
 * so there is no layout jump.
 */
export default function AdminReportsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading daily reports">
      {/* Header */}
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-7 rounded-[var(--radius-soft-sm)]" style={{ width: "200px" }} />
        <SkeletonText lines={1} className="max-w-xs" />
      </div>

      {/* Filter card */}
      <div className="mt-6 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="grid grid-cols-1 gap-3 md:flex md:items-end md:gap-3">
          <div className="min-w-0 md:w-56">
            <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "70px" }} />
            <Skeleton className="mt-1.5 h-[44px] rounded-[12px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "50px" }} />
              <Skeleton className="mt-1.5 h-[44px] rounded-[12px]" />
            </div>
            <div className="min-w-0">
              <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "50px" }} />
              <Skeleton className="mt-1.5 h-[44px] rounded-[12px]" />
            </div>
          </div>
          <Skeleton className="h-[44px] rounded-[12px] md:w-24" />
        </div>
      </div>

      {/* Result count */}
      <div className="mt-3">
        <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "150px" }} />
      </div>

      {/* Summary tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 rounded-[var(--radius-soft-xs)]" style={{ width: "60%" }} />
              <Skeleton className="h-3 rounded-[var(--radius-soft-xs)]" style={{ width: "80%" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="mt-4 hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 md:block">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <Skeleton className="h-3.5 rounded-[var(--radius-soft-xs)]" style={{ width: "18%" }} />
              <Skeleton className="h-3.5 rounded-[var(--radius-soft-xs)]" style={{ width: "10%" }} />
              <Skeleton className="h-3.5 rounded-[var(--radius-soft-xs)]" style={{ width: "30%" }} />
              <Skeleton className="h-3.5 rounded-[var(--radius-soft-xs)]" style={{ width: "30%" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile card skeletons */}
      <div className="mt-4 space-y-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <Skeleton className="h-4 flex-1 rounded-[var(--radius-soft-xs)]" />
              <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "64px" }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Skeleton className="h-14 rounded-[12px]" />
              <Skeleton className="h-14 rounded-[12px]" />
              <Skeleton className="h-14 rounded-[12px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
