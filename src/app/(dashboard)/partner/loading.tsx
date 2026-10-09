import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Partner segment loading UI.
 *
 * Mirrors the partner dashboard layout (hero, report banner, KPI row,
 * progress, pipeline, two-column sections) inside the SAME shared page
 * container as real pages, so there is no layout jump when content loads.
 */
export default function PartnerLoading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Loading partner content">
      {/* Hero */}
      <div className="space-y-2">
        <Skeleton className="h-7 rounded-[var(--radius-sm)]" style={{ width: "220px" }} />
        <SkeletonText lines={1} className="max-w-md" />
      </div>

      {/* Report banner */}
      <div className="dl-surface flex items-center gap-4 p-5">
        <Skeleton className="h-10 w-10 shrink-0 rounded-[10px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 rounded-[var(--radius-sm)]" style={{ width: "180px" }} />
          <SkeletonText lines={1} className="max-w-xs" />
        </div>
        <Skeleton className="h-[32px] w-[110px] shrink-0 rounded-[8px]" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dl-surface p-4">
            <Skeleton className="h-10 w-10 rounded-[10px]" />
            <div className="mt-3">
              <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
            </div>
            <div className="mt-2">
              <SkeletonText lines={1} />
            </div>
          </div>
        ))}
      </div>

      {/* Progress + pipeline */}
      <div className="dl-surface p-5">
        <Skeleton className="h-7 rounded-[var(--radius-sm)]" style={{ width: "120px" }} />
        <div className="mt-4">
          <Skeleton className="h-2 rounded-full" />
        </div>
      </div>
      <div className="dl-surface p-5">
        <Skeleton className="h-5 rounded-[var(--radius-sm)]" style={{ width: "140px" }} />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 rounded-full" />
          ))}
        </div>
      </div>

      {/* Two-column sections */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="dl-surface p-5 lg:col-span-3">
          <SkeletonText lines={3} />
        </div>
        <div className="dl-surface p-5 lg:col-span-2">
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  );
}
