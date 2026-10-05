"use client";

import { getRelativeTimePartner } from "@/components/dashboard/helpers";

interface ActivityProps {
  programDay: number;
  todayReport?: { created_at: string } | null;
  totalReports: number;
  announcements: Array<{ id: string; title: string; is_pinned: boolean; created_at: string }>;
  totalLeads: number;
}

export function MobileActivity({ programDay, todayReport, totalReports, announcements, totalLeads }: ActivityProps) {
  void programDay;
  void totalReports;
  void totalLeads;
  const hasRealItems = !!todayReport || announcements.length > 0;

  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Recent Activity</h2>
      </div>
      <div className="mobile-section-body space-y-0">
        {todayReport && (
          <div className="mobile-activity-item">
            <div className="mobile-activity-dot" style={{ backgroundColor: "var(--status-success)" }} />
            <div className="flex-1 min-w-0">
              <p className="mobile-activity-text">Daily report submitted</p>
              <p className="mobile-activity-time">{getRelativeTimePartner(todayReport.created_at)}</p>
            </div>
          </div>
        )}
        {announcements.slice(0, 2).map((a) => (
          <div key={a.id} className="mobile-activity-item">
            <div className="mobile-activity-dot" style={{ backgroundColor: a.is_pinned ? "var(--accent)" : "var(--text-3)" }} />
            <div className="flex-1 min-w-0">
              <p className="mobile-activity-text">New announcement: {a.title}</p>
              <p className="mobile-activity-time">{getRelativeTimePartner(a.created_at)}</p>
            </div>
          </div>
        ))}
        {!hasRealItems && (
          <div className="mobile-activity-item">
            <div className="mobile-activity-dot" style={{ backgroundColor: "var(--accent)" }} />
            <div className="flex-1 min-w-0">
              <p className="mobile-activity-text">No activity yet today</p>
              <p className="mobile-activity-time">Submit your daily report to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
