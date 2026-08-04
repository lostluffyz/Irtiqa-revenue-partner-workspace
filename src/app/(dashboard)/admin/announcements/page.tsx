import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { AnnouncementActions } from "./announcement-actions";

async function getAnnouncements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch announcements:", error.message);
    return [];
  }

  return data || [];
}

export default async function AnnouncementsPage() {
  await requireAdmin();
  const announcements = await getAnnouncements();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
            Announcements
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-3)]">
            Publish updates and important information.
          </p>
        </div>
        <Link href="/admin/announcements/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </Link>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No announcements"
          description="Create your first announcement for Revenue Partners"
          action={
            <Link href="/admin/announcements/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                New Announcement
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="surface">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-5 py-3 border-b border-[var(--border-subtle)] bg-[#FAFAF8] rounded-t-[10px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">Title</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">Date</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--border-subtle)]">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-5 py-3.5 items-center transition-colors duration-120 hover:bg-[var(--hover-bg)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[var(--text-1)] leading-snug truncate">
                      {announcement.title}
                    </p>
                    {announcement.is_pinned && (
                      <Badge variant="info">Pinned</Badge>
                    )}
                  </div>
                  {announcement.content && (
                    <p className="mt-0.5 text-[12px] text-[var(--text-3)] line-clamp-1">
                      {announcement.content.replace(/\n/g, " ").substring(0, 120)}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-3)] tabular-nums whitespace-nowrap">
                  {new Date(announcement.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <AnnouncementActions id={announcement.id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
