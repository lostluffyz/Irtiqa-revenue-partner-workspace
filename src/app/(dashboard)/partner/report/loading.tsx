import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Partner report loading UI — mirrors the report layout
 * (header, status chip, metric cards, reflection, submit)
 * in the same container, so there is no layout jump.
 */
export default function PartnerReportLoading() {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl" aria-busy="true" aria-label="Loading daily report">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 rounded-[var(--radius-soft-sm)]" style={{ width: "180px" }} />
        <SkeletonText lines={1} className="max-w-xs" />
        <Skeleton className="h-[28px] w-[130px] rounded-[var(--radius-soft-pill)]" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-[12px]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 rounded-[var(--radius-soft-xs)]" style={{ width: "70%" }} />
                <Skeleton className="h-3 rounded-[var(--radius-soft-xs)]" style={{ width: "90%" }} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Skeleton className="h-[44px] w-[44px] rounded-[10px]" />
              <Skeleton className="h-[44px] w-20 rounded-[10px]" />
              <Skeleton className="h-[44px] w-[44px] rounded-[10px]" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
