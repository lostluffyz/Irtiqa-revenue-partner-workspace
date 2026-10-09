import { requirePartner } from "@/lib/partner";
import { Megaphone } from "lucide-react";
import { redirect } from "next/navigation";
import type { Announcement } from "@/types/database";
import {
  AnnouncementCard,
  EmptyContentCard,
  formatPostedDate,
} from "@/components/cards/content-cards";

// ============================================
// Data Fetching (unchanged query)
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
        <EmptyContentCard
          icon={<Megaphone className="h-7 w-7" />}
          title="No announcements yet"
          body="Important updates from your admin will show up here."
        />
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">
                  Pinned
                </h2>
                <span className="text-[11px] text-[var(--text-3)] tabular-nums">
                  {pinned.length}
                </span>
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              </div>
              <div className="space-y-3">
                {pinned.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    title={announcement.title}
                    content={announcement.content}
                    pinned={true}
                    postedLabel={`Posted ${formatPostedDate(announcement.created_at)}`}
                    postedTitle={announcement.created_at}
                  />
                ))}
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
              <div className="space-y-3">
                {regular.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    title={announcement.title}
                    content={announcement.content}
                    pinned={false}
                    postedLabel={`Posted ${formatPostedDate(announcement.created_at)}`}
                    postedTitle={announcement.created_at}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
