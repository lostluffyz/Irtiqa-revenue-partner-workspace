import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Partner leads loading UI — mirrors the card-row layout
 * (header, tiles, chips, rounded cards) in the same container,
 * so there is no layout jump when content loads.
 */
export default function PartnerLeadsLoading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Loading leads">
      <div className="space-y-2">
        <Skeleton className="h-7 rounded-[var(--radius-soft-sm)]" style={{ width: "140px" }} />
        <SkeletonText lines={1} className="max-w-xs" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-soft-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5"
          >
            <Skeleton className="h-8 w-8 rounded-[var(--radius-soft-md)]" />
            <div className="mt-2">
              <Skeleton className="h-5 w-12 rounded-[var(--radius-soft-xs)]" />
            </div>
            <div className="mt-1">
              <SkeletonText lines={1} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[32px] w-[110px] shrink-0 rounded-[var(--radius-soft-pill)]" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-soft-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <Skeleton className="h-10 w-10 rounded-[var(--radius-soft-md)]" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "60%" }} />
              <Skeleton className="h-3 rounded-[var(--radius-soft-xs)]" style={{ width: "40%" }} />
            </div>
            <Skeleton className="h-6 w-[110px] rounded-[var(--radius-soft-pill)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
