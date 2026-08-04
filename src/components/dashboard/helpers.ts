/**
 * Dashboard Helpers — Client-safe module
 *
 * Contains types, constants, and helper functions that can be safely
 * imported by both server and client components. No server-only imports.
 */
import React from "react";
import {
  Users,
  Target,
  FileText,
  Megaphone,
  Activity,
} from "lucide-react";
import type { DailyReport, Announcement, PartnerActivityLog } from "@/types/database";

// Re-export non-server timezone utils
export { formatDeadlineTime, formatDeadlineInTimezone, getBusinessDate } from "@/lib/program-timezone";

// PROGRAM_TIMEZONE: defined here (not imported from @/lib/partner which has server-only deps)
// In Next.js, process.env values are inlined at build time for both server and client.
export const PROGRAM_TIMEZONE = process.env.PROGRAM_TIMEZONE || "Asia/Kolkata";

/* ═══════════════════════════════════════════════════════════════
   Admin Dashboard Types
   ═══════════════════════════════════════════════════════════════ */

export type ReportWithType = DailyReport & {
  partners?: {
    company_id?: string;
    profiles: { full_name: string };
  };
};

export interface AdminDashboardData {
  counts: {
    totalPartners: number;
    activePartners: number;
    totalLeads: number;
    unassignedLeads: number;
    reportsToday: number;
    appointmentsToday: number;
  };
  recentReports: ReportWithType[];
  recentActivity: PartnerActivityLog[];
  recentAnnouncements: Announcement[];
  compliance: {
    compliance_percentage: number;
    submitted_count: number;
    total_active_partners: number;
    pending_count: number;
    overdue_count: number;
    deadline_display: string;
    grace_period_minutes: number;
  };
  firstName: string;
}

/* ═══════════════════════════════════════════════════════════════
   Partner Dashboard Types
   ═══════════════════════════════════════════════════════════════ */

export interface PartnerDashboardData {
  programDay: number;
  totalLeads: number;
  todayReport: DailyReport | null;
  totalLeadsContacted: number;
  totalAppointments: number;
  totalDeals: number;
  totalReports: number;
  announcements: Announcement[];
}

export interface PartnerPageData {
  data: PartnerDashboardData;
  complianceStatus: {
    status: "submitted" | "pending" | "overdue";
    deadline_hour?: number;
    deadline_minute?: number;
    overdue_duration?: string;
  };
  greeting: string;
  firstName: string;
  dayOfWeek: string;
  monthDay: string;
  today: string;
  progressPct: number;
  daysRemaining: number;
}

/* ═══════════════════════════════════════════════════════════════
   Helper Functions — Admin
   ═══════════════════════════════════════════════════════════════ */

export function getAdminGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getActivityIcon(action: string): { icon: React.ReactNode; color: string; bg: string } {
  if (action.includes("partner")) return { icon: React.createElement(Users, { className: "h-3.5 w-3.5" }), color: "text-blue-600", bg: "bg-blue-50" };
  if (action.includes("lead")) return { icon: React.createElement(Target, { className: "h-3.5 w-3.5" }), color: "text-purple-600", bg: "bg-purple-50" };
  if (action.includes("report")) return { icon: React.createElement(FileText, { className: "h-3.5 w-3.5" }), color: "text-emerald-600", bg: "bg-emerald-50" };
  if (action.includes("announcement")) return { icon: React.createElement(Megaphone, { className: "h-3.5 w-3.5" }), color: "text-amber-600", bg: "bg-amber-50" };
  return { icon: React.createElement(Activity, { className: "h-3.5 w-3.5" }), color: "text-gray-500", bg: "bg-gray-50" };
}

export function getRelativeTime(dateStr: string): string {
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

export function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════════
   Helper Functions — Partner
   ═══════════════════════════════════════════════════════════════ */

export function getPartnerGreeting(): string {
  const hour = new Date().toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: PROGRAM_TIMEZONE,
  });
  const h = parseInt(hour, 10);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function formatMonthDay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getRelativeTimePartner(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════
   Constants — Partner Pipeline
   ═══════════════════════════════════════════════════════════════ */

export const PIPELINE_COLORS: Record<string, string> = {
  not_contacted: "#9CA3AF",
  contacted: "#1A56DB",
  follow_up_required: "#D97706",
  appointment_booked: "#059669",
  closed: "#047857",
  not_interested: "#DC2626",
  invalid_contact: "#DC2626",
};

export const PIPELINE_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  follow_up_required: "Follow Up",
  appointment_booked: "Appt Booked",
  closed: "Closed",
};

export const PIPELINE_STATUSES = ["not_contacted", "contacted", "follow_up_required", "appointment_booked", "closed"] as const;
