import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Partner progress loading UI — mirrors the progress layout
 * (header, progress card, average tiles, pipeline card)
 * in the same container, so there is no layout jump.
 */
export default function PartnerProgressLoading() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl" aria-busy="true" aria-label="Loading progress">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-7 rounded-[var(--radius-soft-sm)]" style={{ width: "150px" }} />
        <SkeletonText lines={1} className="max-w-xs" />
      </div>

      <div className="mb-8 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "140px" }} />
          <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "90px" }} />
        </div>
        <div className="mt-4">
          <Skeleton className="h-2 rounded-full" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface p-4">
            <Skeleton className="h-7 w-7 rounded-[8px]" />
            <div className="mt-3">
              <Skeleton className="h-6 w-14 rounded-[var(--radius-soft-xs)]" />
            </div>
            <div className="mt-1.5">
              <SkeletonText lines={1} />
            </div>
          </div>
        ))}
      </div>

      <div className="surface p-5">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
