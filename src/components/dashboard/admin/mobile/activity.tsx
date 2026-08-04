"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Users, Target, FileText, Megaphone, Activity as ActivityIcon } from "lucide-react";
import type { PartnerActivityLog } from "@/types/database";

interface ActivityProps {
  activities: PartnerActivityLog[];
}

function getActivityIcon(action: string): { icon: React.ReactNode; color: string; bg: string } {
  if (action.includes("partner")) return { icon: <Users className="h-3.5 w-3.5" />, color: "text-blue-600", bg: "bg-blue-50" };
  if (action.includes("lead")) return { icon: <Target className="h-3.5 w-3.5" />, color: "text-purple-600", bg: "bg-purple-50" };
  if (action.includes("report")) return { icon: <FileText className="h-3.5 w-3.5" />, color: "text-emerald-600", bg: "bg-emerald-50" };
  if (action.includes("announcement")) return { icon: <Megaphone className="h-3.5 w-3.5" />, color: "text-amber-600", bg: "bg-amber-50" };
  return { icon: <ActivityIcon className="h-3.5 w-3.5" />, color: "text-gray-500", bg: "bg-gray-50" };
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

function formatActionLabel(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
}

export function MobileActivity({ activities }: ActivityProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div>
          <h2 className="mobile-section-title">Recent Activity</h2>
          <p className="text-[13px] text-[var(--text-3)] mt-0.5">What your partners have been up to</p>
        </div>
        <Link href="/admin/activity" className="mobile-section-link">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="mobile-empty">
          <Clock className="mobile-empty-icon" />
          <p className="mobile-empty-text">No recent activity.</p>
        </div>
      ) : (
        <div className="mobile-section-body">
          {activities.map((activity) => {
            const { icon, color, bg } = getActivityIcon(activity.action);
            return (
              <div key={activity.id} className="mobile-activity-item">
                <div className={`mobile-activity-dot ${bg} flex items-center justify-center`}>
                  <span className={color}>{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mobile-activity-text">{formatActionLabel(activity.action)}</p>
                  <p className="mobile-activity-time">{getRelativeTime(activity.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
