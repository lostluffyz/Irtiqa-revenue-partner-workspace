"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRelativeTimePartner } from "@/components/dashboard/helpers";
import type { Announcement } from "@/types/database";

interface AnnouncementsProps {
  announcements: Announcement[];
}

export function MobileAnnouncements({ announcements }: AnnouncementsProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div className="flex items-center gap-2.5">
          <Megaphone className="h-5 w-5 text-[var(--text-3)]" />
          <h2 className="mobile-section-title">Announcements</h2>
        </div>
        <Link href="/partner/announcements" className="mobile-section-link">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="mobile-empty">
          <Megaphone className="mobile-empty-icon" />
          <p className="mobile-empty-text">No announcements yet</p>
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
                {announcement.is_pinned && (
                  <Badge variant="info" className="text-[11px] shrink-0">Pinned</Badge>
                )}
              </div>
              <p className="text-[12px] text-[var(--text-3)] tabular-nums">
                {getRelativeTimePartner(announcement.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
