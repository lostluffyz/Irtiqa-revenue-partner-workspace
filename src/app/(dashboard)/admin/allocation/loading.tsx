import { Skeleton, SkeletonText, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Allocation route loading UI — mirrors the allocation layout
 * (header + policy strip + KPI row + report table) inside the same
 * shared page container, so there is no layout jump when content loads.
 */
export default function AllocationLoading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Loading allocation report">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 rounded-[var(--radius-sm)]" style={{ width: "200px" }} />
          <SkeletonText lines={1} className="max-w-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-[32px] w-[90px] rounded-[8px]" />
          <Skeleton className="h-[32px] w-[120px] rounded-[8px]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[26px] rounded-full" style={{ width: "150px" }} />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dl-surface p-4">
            <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
            <div className="mt-2">
              <SkeletonText lines={1} />
            </div>
          </div>
        ))}
      </div>

      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
