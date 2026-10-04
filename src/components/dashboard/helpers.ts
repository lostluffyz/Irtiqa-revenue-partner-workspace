/**
 * Dashboard Helpers — Client-safe module
 *
 * Contains types, constants, and helper functions that can be safely
 * imported by both server and client components. No server-only imports.
 */
import React from "react";
import {
  Users,
  Megaphone,
  Activity,
  ClipboardCheck,
  StickyNote,
  ArrowLeftRight,
  CalendarCheck,
  Globe,
} from "lucide-react";
import type { DailyReport, Announcement, PartnerActivityLog } from "@/types/database";

// Re-export non-server timezone utils
export { formatDeadlineTime, formatDeadlineInTimezone, getBusinessDate } from "@/lib/program-timezone";
import { getBusinessDate } from "@/lib/program-timezone";

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
  // Distinct glyph per event kind, single neutral tile — color is reserved for status.
  const neutral = { color: "text-[var(--text-2)]", bg: "bg-[var(--hover-bg)]" };
  const props = { className: "h-3.5 w-3.5" };
  if (action.includes("lead_notes")) return { icon: React.createElement(StickyNote, props), ...neutral };
  if (action.includes("lead")) return { icon: React.createElement(ArrowLeftRight, props), ...neutral };
  if (action.includes("report")) return { icon: React.createElement(ClipboardCheck, props), ...neutral };
  if (action.includes("partner")) return { icon: React.createElement(Users, props), ...neutral };
  if (action.includes("announcement")) return { icon: React.createElement(Megaphone, props), ...neutral };
  if (action.includes("allocation")) return { icon: React.createElement(CalendarCheck, props), ...neutral };
  if (action.includes("scrape")) return { icon: React.createElement(Globe, props), ...neutral };
  return { icon: React.createElement(Activity, props), ...neutral };
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

/* ═══════════════════════════════════════════════════════════════
   Breadcrumbs — Display-only route labels for shell headers
   ═══════════════════════════════════════════════════════════════ */

export interface BreadcrumbSegments {
  section: string;
  page: string;
}

const ADMIN_ROUTES: Array<{ prefix: string; page: string }> = [
  { prefix: "/admin/partners/create", page: "Add Partner" },
  { prefix: "/admin/partners/", page: "Partner Details" },
  { prefix: "/admin/partners", page: "Partners" },
  { prefix: "/admin/leads/upload", page: "Upload Leads" },
  { prefix: "/admin/leads", page: "Leads" },
  { prefix: "/admin/allocation", page: "Allocation" },
  { prefix: "/admin/scrape", page: "Lead Scraper" },
  { prefix: "/admin/reports", page: "Reports" },
  { prefix: "/admin/activity", page: "Activity" },
  { prefix: "/admin/announcements/new", page: "New Announcement" },
  { prefix: "/admin/announcements/edit", page: "Edit Announcement" },
  { prefix: "/admin/announcements", page: "Announcements" },
  { prefix: "/admin/resources/new", page: "New Resource" },
  { prefix: "/admin/resources/edit", page: "Edit Resource" },
  { prefix: "/admin/resources", page: "Resources" },
  { prefix: "/admin", page: "Dashboard" },
];

const PARTNER_ROUTES: Array<{ prefix: string; page: string }> = [
  { prefix: "/partner/leads", page: "My Leads" },
  { prefix: "/partner/report", page: "Daily Report" },
  { prefix: "/partner/progress", page: "Progress" },
  { prefix: "/partner/announcements", page: "Announcements" },
  { prefix: "/partner/resources", page: "Resources" },
  { prefix: "/partner", page: "Dashboard" },
];

/**
 * Map the current pathname to [section, page] labels for the shell header.
 * Pure display function — no routing or auth implications.
 */
export function getBreadcrumbSegments(pathname: string): BreadcrumbSegments {
  const isAdmin = pathname.startsWith("/admin");
  const routes = isAdmin ? ADMIN_ROUTES : PARTNER_ROUTES;
  for (const route of routes) {
    if (
      pathname === route.prefix ||
      pathname.startsWith(route.prefix + "/") ||
      (route.prefix.endsWith("/") && pathname.startsWith(route.prefix))
    ) {
      return { section: isAdmin ? "Admin" : "Partner", page: route.page };
    }
  }
  return { section: isAdmin ? "Admin" : "Partner", page: "Dashboard" };
}

/* ═══════════════════════════════════════════════════════════════
   Report Dates — Timezone-safe display formatting
   ═══════════════════════════════════════════════════════════════ */

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function parseDateParts(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/**
 * Format a plain YYYY-MM-DD report_date for display without timezone shift.
 *
 * Never uses `new Date("YYYY-MM-DD")` (UTC-midnight parsing shifts the day
 * in positive-offset timezones). Day arithmetic uses Date.UTC noon-safe math.
 *
 * @param reportDate - plain date string (YYYY-MM-DD)
 * @param todayStr - reference "today" (defaults to program business date);
 *   injectable for tests
 * @returns "Today" | "Yesterday" | "Oct 2" | "Oct 2, 2025" (or input as-is if invalid)
 */
export function formatReportDate(reportDate: string, todayStr?: string): string {
  const parts = parseDateParts(reportDate);
  if (!parts) return reportDate;

  const today = parseDateParts((todayStr ?? getBusinessDate()).trim());
  if (!today) return `${SHORT_MONTHS[parts.m - 1]} ${parts.d}`;

  const dayMs = 86400000;
  const diffDays = Math.round(
    (Date.UTC(today.y, today.m - 1, today.d) - Date.UTC(parts.y, parts.m - 1, parts.d)) / dayMs,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (parts.y === today.y) return `${SHORT_MONTHS[parts.m - 1]} ${parts.d}`;
  return `${SHORT_MONTHS[parts.m - 1]} ${parts.d}, ${parts.y}`;
}

/* ═══════════════════════════════════════════════════════════════
   Website Hostnames — Clean display for lead website cells
   ═══════════════════════════════════════════════════════════════ */

/**
 * Extract a clean hostname for display (no protocol, www, path, or query).
 * The original full URL is always kept as the link href / tooltip.
 *
 * @param url - raw website string (may lack protocol or be invalid)
 * @returns hostname, or the trimmed input when it cannot be parsed
 */
export function formatWebsiteHostname(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const hostname = new URL(withProtocol).hostname.toLowerCase();
    return hostname.replace(/^www\./, "") || trimmed;
  } catch {
    return trimmed;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Short Dates — Timezone-safe display for program/allocation dates
   ═══════════════════════════════════════════════════════════════ */

/**
 * Format a plain YYYY-MM-DD date as "Sep 14" without timezone shifting.
 * Never uses `new Date("YYYY-MM-DD")` (UTC-midnight parsing shifts the day
 * in negative-offset timezones when formatted locally).
 *
 * @returns "Sep 14", or the input as-is when invalid
 */
export function formatShortMonthDay(dateStr: string): string {
  const parts = parseDateParts(dateStr.trim());
  if (!parts) return dateStr;
  return `${SHORT_MONTHS[parts.m - 1]} ${parts.d}`;
}

/**
 * Format a plain-date range as "Oct 2 – Oct 9" without timezone shifting.
 */
export function formatShortDateRange(start: string, end: string): string {
  return `${formatShortMonthDay(start)} – ${formatShortMonthDay(end)}`;
}

/* ═══════════════════════════════════════════════════════════════
   Job Timestamps — Explicit-timezone display for scrape jobs
   ═══════════════════════════════════════════════════════════════ */

/**
 * Format a full ISO timestamp as "Oct 4, 6:16 PM" (no zone suffix).
 *
 * The zone is shown once in the column header (see getViewerShortZoneName),
 * so cells stay short enough to never clip. The full timestamp with zone
 * always goes in the cell's title tooltip.
 *
 * Full timestamps (with time) are safe for `new Date` — only plain
 * YYYY-MM-DD strings shift.
 *
 * @param iso - full ISO timestamp from the database
 * @param timeZone - IANA zone override (defaults to the viewer's locale);
 *   pass "UTC" in tests for determinism
 * @returns formatted string, or the input as-is when invalid
 */
export function formatJobDateTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const opts = timeZone ? { timeZone } : {};
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...opts,
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  });
  return `${datePart}, ${timePart}`;
}

/**
 * Short display name of a timezone ("IST", "GMT+5:30", "UTC").
 * Used once in table headers so cells don't repeat it per row.
 *
 * @param now - reference date (defaults to now; inject for tests)
 * @param timeZone - IANA zone to name (defaults to the viewer's locale)
 */
export function getViewerShortZoneName(now: Date = new Date(), timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
    ...(timeZone !== undefined ? { timeZone } : {}),
  }).formatToParts(now);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}
