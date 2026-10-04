import { Skeleton, SkeletonText, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Partner segment loading UI.
 *
 * Rendered by Next.js as the Suspense fallback during client-side
 * navigation to ANY /partner route. Lives inside the SAME shared page
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

      {/* Cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dl-surface p-4">
            <Skeleton className="h-7 w-16 rounded-[var(--radius-sm)]" />
            <div className="mt-2">
              <SkeletonText lines={1} />
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      <SkeletonTable rows={5} cols={3} />
    </div>
  );
}
