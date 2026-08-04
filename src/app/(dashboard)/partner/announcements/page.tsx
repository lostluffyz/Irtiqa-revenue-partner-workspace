import { requirePartner } from "@/lib/partner";
import { EmptyState } from "@/components/ui/empty-state";
import { Megaphone, Pin } from "lucide-react";
import { redirect } from "next/navigation";
import type { Announcement } from "@/types/database";

// ============================================
// Helpers
// ============================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

function getFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================
// Data Fetching
// ============================================

async function getAnnouncements(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
) {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch announcements:", error.message);
    return [];
  }

  return (data || []) as Announcement[];
}

// ============================================
// Page
// ============================================

export default async function PartnerAnnouncementsPage() {
  const { supabase } = await requirePartner().catch(() => {
    throw redirect("/login");
  });

  const announcements = await getAnnouncements(supabase);

  const pinned = announcements.filter((a) => a.is_pinned);
  const regular = announcements.filter((a) => !a.is_pinned);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          Announcements
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-2)]">
          Updates, reminders, and important notices from the team.
        </p>
        <div className="mt-3 h-px bg-[var(--border-subtle)]" />
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title="No announcements yet"
          description="Important updates and notices from your admin will appear here."
        />
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Pin className="h-4 w-4 text-[var(--text-3)]" />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">
                  Pinned
                </h2>
                <span className="text-[11px] text-[var(--text-3)] tabular-nums">
                  {pinned.length}
                </span>
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              </div>
              <div className="surface">
                <div className="divide-y divide-[var(--border-subtle)]">
                  {pinned.map((announcement) => (
                    <AnnouncementItem
                      key={announcement.id}
                      announcement={announcement}
                      isPinned
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Regular Section */}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2.5 mb-3">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">
                    Recent
                  </h2>
                  <span className="text-[11px] text-[var(--text-3)] tabular-nums">
                    {regular.length}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                </div>
              )}
              <div className="surface">
                <div className="divide-y divide-[var(--border-subtle)]">
                  {regular.map((announcement) => (
                    <AnnouncementItem
                      key={announcement.id}
                      announcement={announcement}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Announcement Item
// ============================================

function AnnouncementItem({
  announcement,
  isPinned,
}: {
  announcement: Announcement;
  isPinned?: boolean;
}) {
  return (
    <div
      className={`
        px-5 py-3.5 transition-all duration-150
        hover:bg-[var(--hover-bg)] active:scale-[0.99]
        ${isPinned
          ? "border-l-2 border-l-[var(--accent)] hover:-translate-y-px hover:shadow-sm"
          : ""
        }
      `}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        {isPinned && (
          <Pin className="h-3 w-3 text-[var(--accent)] shrink-0" />
        )}
        <h3 className="text-[14px] font-semibold text-[var(--text-1)] leading-snug truncate">
          {announcement.title}
        </h3>
      </div>

      {/* Content preview */}
      <div
        className="text-[13px] leading-relaxed text-[var(--text-2)] line-clamp-2"
        dangerouslySetInnerHTML={{
          __html: announcement.content.replace(/\n/g, " "),
        }}
      />

      {/* Timestamp */}
      <p
        className="mt-1.5 text-[11px] text-[var(--text-3)] tabular-nums"
        title={getFullDate(announcement.created_at)}
      >
        {getRelativeTime(announcement.created_at)}
      </p>
    </div>
  );
}
