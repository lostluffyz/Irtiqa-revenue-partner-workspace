"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, Pin } from "lucide-react";
import type { Announcement } from "@/types/database";

interface AnnouncementsProps {
  announcements: Announcement[];
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MobileAnnouncements({ announcements }: AnnouncementsProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div className="flex items-center gap-2.5">
          <Megaphone className="h-5 w-5 text-[var(--text-3)]" />
          <div>
            <h2 className="mobile-section-title">Announcements</h2>
            <p className="text-[13px] text-[var(--text-3)] mt-0.5">Latest from the admin team</p>
          </div>
        </div>
        <Link href="/admin/announcements" className="mobile-section-link">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="mobile-empty">
          <Megaphone className="mobile-empty-icon" />
          <p className="mobile-empty-text">No announcements yet.</p>
        </div>
      ) : (
        <div className="mobile-section-body">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="mobile-announce-item">
              <div className="flex items-center gap-2 mb-1">
                {announcement.is_pinned && (
                  <Pin className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                )}
                <p className="text-[14px] font-medium text-[var(--text-1)] leading-snug truncate">
                  {announcement.title}
                </p>
              </div>
              <p className="mt-1.5 text-[13px] text-[var(--text-3)] line-clamp-2 leading-relaxed">
                {announcement.content.replace(/\n/g, " ").substring(0, 120)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[12px] text-[var(--text-3)] tabular-nums">{getRelativeTime(announcement.created_at)}</p>
                {announcement.is_pinned && (
                  <span className="text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded">Pinned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
