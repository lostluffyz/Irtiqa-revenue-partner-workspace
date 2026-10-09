"use client";

import Link from "next/link";
import { Upload, Plus, Megaphone, Eye } from "lucide-react";

const CHIP =
  "inline-flex shrink-0 items-center gap-1.5 h-[34px] px-3.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2";

/**
 * MobileQuickActions — compact horizontally-scrollable chip row.
 * Same 4 destinations as desktop, below the KPIs.
 */
export function MobileQuickActions() {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      role="navigation"
      aria-label="Quick actions"
    >
      <Link href="/admin/leads/upload" className={CHIP}>
        <Upload className="h-4 w-4 text-[var(--text-2)]" />
        Upload CSV
      </Link>

      <Link href="/admin/partners/create" className={CHIP}>
        <Plus className="h-4 w-4 text-[var(--text-2)]" />
        Add Partner
      </Link>

      <Link href="/admin/announcements/new" className={CHIP}>
        <Megaphone className="h-4 w-4 text-[var(--text-2)]" />
        Announcement
      </Link>

      <Link href="/admin/reports" className={CHIP}>
        <Eye className="h-4 w-4 text-[var(--text-2)]" />
        View Reports
      </Link>
    </div>
  );
}
