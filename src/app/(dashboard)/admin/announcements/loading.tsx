import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Admin announcements loading UI — mirrors the list layout
 * (header + stacked cards) in the same container.
 */
export default function AdminAnnouncementsLoading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading announcements">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 rounded-[var(--radius-soft-sm)]" style={{ width: "200px" }} />
          <SkeletonText lines={1} className="max-w-xs" />
        </div>
        <Skeleton className="h-[32px] w-[130px] shrink-0 rounded-[8px]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <Skeleton className="h-4 rounded-[var(--radius-soft-xs)]" style={{ width: "55%" }} />
            <div className="mt-2">
              <SkeletonText lines={2} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-3 rounded-[var(--radius-soft-xs)]" style={{ width: "120px" }} />
              <Skeleton className="h-8 w-32 rounded-[8px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
