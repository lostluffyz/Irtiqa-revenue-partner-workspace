"use client";

import { getRelativeTimePartner } from "@/components/dashboard/helpers";

interface ActivityItem {
  id: string;
  color: string;
  text: string;
  time: string;
}

interface ActivityProps {
  programDay: number;
  todayReport?: { created_at: string } | null;
  totalReports: number;
  announcements: Array<{ id: string; title: string; is_pinned: boolean; created_at: string }>;
  totalLeads: number;
}

export function MobileActivity({ programDay, todayReport, totalReports, announcements, totalLeads }: ActivityProps) {
  const items: ActivityItem[] = [
    { id: "milestone", color: "var(--accent)", text: `Day ${programDay} of program`, time: "Today" },
  ];

  if (todayReport) {
    items.push({ id: "report", color: "var(--status-success)", text: "Daily report submitted", time: getRelativeTimePartner(todayReport.created_at) });
  }

  if (totalReports > 0) {
    items.push({ id: "reports-count", color: "#1A56DB", text: `${totalReports} reports submitted`, time: "All time" });
  }

  announcements.slice(0, 2).forEach((a) => {
    items.push({ id: `ann-${a.id}`, color: a.is_pinned ? "var(--accent)" : "var(--text-3)", text: `New announcement: ${a.title}`, time: getRelativeTimePartner(a.created_at) });
  });

  if (totalLeads > 0) {
    items.push({ id: "leads", color: "#059669", text: `${totalLeads} leads assigned to you`, time: "All time" });
  }

  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Recent Activity</h2>
      </div>
      <div className="mobile-section-body space-y-0">
        {items.map((item) => (
          <div key={item.id} className="mobile-activity-item">
            <div className="mobile-activity-dot" style={{ backgroundColor: item.color }} />
            <div className="flex-1 min-w-0">
              <p className="mobile-activity-text">{item.text}</p>
              <p className="mobile-activity-time">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
