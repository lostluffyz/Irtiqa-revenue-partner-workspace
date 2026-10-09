import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Admin resources loading UI — mirrors the list layout
 * (header + card grid) in the same container.
 */
export default function AdminResourcesLoading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading resources">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 rounded-[var(--radius-soft-sm)]" style={{ width: "170px" }} />
          <SkeletonText lines={1} className="max-w-xs" />
        </div>
        <Skeleton className="h-[32px] w-[120px] shrink-0 rounded-[8px]" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-[10px]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "70%" }} />
                <Skeleton className="h-3 rounded-[var(--radius-soft-xs)]" style={{ width: "40%" }} />
              </div>
            </div>
            <div className="mt-3">
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
