import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone } from "lucide-react";
import Link from "next/link";
import { AnnouncementActions } from "./announcement-actions";
import {
  AnnouncementCard,
  EmptyContentCard,
  formatPostedDate,
} from "@/components/cards/content-cards";

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
      <div className="flex items-start justify-between gap-3 mb-8 max-sm:flex-col max-sm:items-stretch">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
            Announcements
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-3)]">
            Publish updates and important information.
          </p>
        </div>
        {announcements.length > 0 && (
          <Link href="/admin/announcements/new" className="shrink-0 max-sm:basis-full max-sm:mt-1">
            <Button size="sm" className="whitespace-nowrap max-sm:min-h-[48px] max-sm:w-full">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New announcement</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        )}
      </div>

      {announcements.length === 0 ? (
        <EmptyContentCard
          icon={<Megaphone className="h-7 w-7" />}
          title="No announcements yet"
          body="Create your first announcement for your partners."
          action={
            <Link href="/admin/announcements/new">
              <Button size="sm" className="min-h-[44px]">
                <Plus className="h-3.5 w-3.5" />
                New announcement
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              title={announcement.title}
              content={announcement.content}
              pinned={announcement.is_pinned}
              postedLabel={`Posted ${formatPostedDate(announcement.created_at)}`}
              postedTitle={announcement.created_at}
              footer={
                <div className="mt-3 flex items-center gap-1 border-t border-[var(--border-subtle)] pt-3">
                  <AnnouncementActions id={announcement.id} />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
