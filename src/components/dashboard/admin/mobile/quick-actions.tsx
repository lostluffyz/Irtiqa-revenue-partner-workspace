"use client";

import Link from "next/link";
import { Upload, Plus, Megaphone, Eye } from "lucide-react";

export function MobileQuickActions() {
  return (
    <div className="mobile-action-grid">
      <Link href="/admin/leads/upload" className="mobile-action-card mobile-card-press">
        <div className="mobile-action-icon">
          <Upload className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <p className="mobile-action-label">Upload CSV</p>
        <p className="mobile-action-sub">Import leads</p>
      </Link>

      <Link href="/admin/partners/create" className="mobile-action-card mobile-card-press">
        <div className="mobile-action-icon">
          <Plus className="h-5 w-5 text-[var(--status-success)]" />
        </div>
        <p className="mobile-action-label">Add Partner</p>
        <p className="mobile-action-sub">New revenue partner</p>
      </Link>

      <Link href="/admin/announcements/new" className="mobile-action-card mobile-card-press">
        <div className="mobile-action-icon">
          <Megaphone className="h-5 w-5 text-[var(--status-warning)]" />
        </div>
        <p className="mobile-action-label">Announcement</p>
        <p className="mobile-action-sub">Publish update</p>
      </Link>

      <Link href="/admin/reports" className="mobile-action-card mobile-card-press">
        <div className="mobile-action-icon">
          <Eye className="h-5 w-5 text-purple-600" />
        </div>
        <p className="mobile-action-label">View Reports</p>
        <p className="mobile-action-sub">Daily activity</p>
      </Link>
    </div>
  );
}
