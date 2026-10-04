import { Skeleton, SkeletonText, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Scraper route loading UI — mirrors the scrape layout
 * (header + form card + jobs table) inside the same shared
 * page container, so there is no layout jump when content loads.
 */
export default function ScrapeLoading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Loading lead scraper">
      <div className="space-y-2">
        <Skeleton className="h-7 rounded-[var(--radius-sm)]" style={{ width: "180px" }} />
        <SkeletonText lines={1} className="max-w-md" />
      </div>

      <div className="dl-surface p-5">
        <Skeleton className="h-5 rounded-[var(--radius-sm)]" style={{ width: "160px" }} />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-[44px] rounded-[8px]" />
          <Skeleton className="h-[44px] rounded-[8px]" />
          <Skeleton className="h-[44px] rounded-[8px]" />
          <Skeleton className="h-[44px] rounded-[8px]" />
        </div>
      </div>

      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
