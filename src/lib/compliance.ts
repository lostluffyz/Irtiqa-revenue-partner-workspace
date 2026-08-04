// ============================================
// Daily Report Compliance Service
// ============================================
//
// Centralized compliance calculation engine.
// All report status determination flows through this module.
//
// Report states are COMPUTED, never stored:
//   - Submitted: today's report exists in daily_reports
//   - Pending:   no report + current time is BEFORE deadline (+ grace period)
//   - Overdue:   no report + current time is AFTER deadline (+ grace period)
//
// Configuration is read from environment variables:
//   - REPORT_DEADLINE_TIME:          "HH:MM" format (default "18:00")
//   - REPORT_GRACE_PERIOD_MINUTES:   minutes after deadline (default "15")
//   - PROGRAM_TIMEZONE:              IANA timezone (default "Asia/Kolkata")
//
// Extensibility:
//   PartnerComplianceRecord stores raw data (submitted_at, overdue_duration_minutes)
//   that enables future features without refactoring:
//   - Reporting streaks: query consecutive submitted_at dates
//   - Monthly compliance: aggregate report_status by month
//   - Missed-report history: filter report_status === "overdue" by date range

import { createClient } from "@/lib/supabase/server";
import { getBusinessDate } from "@/lib/program-timezone";

// ============================================
// Configuration
// ============================================

const DEFAULT_DEADLINE_HOUR = 18;
const DEFAULT_DEADLINE_MINUTE = 0;
const DEFAULT_GRACE_PERIOD_MINUTES = 15;

/**
 * Read all compliance configuration from environment variables.
 * Returns parsed values with safe fallbacks for invalid input.
 */
export function getComplianceConfig(): {
  deadlineHour: number;
  deadlineMinute: number;
  gracePeriodMinutes: number;
  timezone: string;
} {
  const timezone = process.env.PROGRAM_TIMEZONE || "Asia/Kolkata";

  // Parse REPORT_DEADLINE_TIME (format "HH:MM")
  const deadlineRaw = process.env.REPORT_DEADLINE_TIME;
  let deadlineHour = DEFAULT_DEADLINE_HOUR;
  let deadlineMinute = DEFAULT_DEADLINE_MINUTE;

  if (deadlineRaw) {
    const parts = deadlineRaw.split(":");
    const h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;

    if (!Number.isNaN(h) && h >= 0 && h <= 23) {
      deadlineHour = h;
    }
    if (!Number.isNaN(m) && m >= 0 && m <= 59) {
      deadlineMinute = m;
    }
  }

  // Parse REPORT_GRACE_PERIOD_MINUTES
  const graceRaw = process.env.REPORT_GRACE_PERIOD_MINUTES;
  let gracePeriodMinutes = DEFAULT_GRACE_PERIOD_MINUTES;

  if (graceRaw) {
    const g = parseInt(graceRaw, 10);
    if (!Number.isNaN(g) && g >= 0 && g <= 120) {
      gracePeriodMinutes = g;
    }
  }

  return { deadlineHour, deadlineMinute, gracePeriodMinutes, timezone };
}

// ============================================
// Types
// ============================================

export type ReportStatus = "submitted" | "pending" | "overdue";

export interface PartnerComplianceRecord {
  partner_id: string;
  full_name: string;
  company_id: string;
  report_status: ReportStatus;
  submitted_at: string | null;
  overdue_duration_minutes: number | null;
}

export interface ComplianceSummary {
  total_active_partners: number;
  submitted_count: number;
  pending_count: number;
  overdue_count: number;
  compliance_percentage: number;
  partners: PartnerComplianceRecord[];
  deadline_display: string;
  grace_period_minutes: number;
}

export interface PartnerComplianceStatus {
  status: ReportStatus;
  isOverdue: boolean;
  deadline_hour: number;
  deadline_minute: number;
  overdue_duration: string | null;
}

// ============================================
// Core Evaluation Functions
// ============================================

/**
 * Get the current hour and minute in the given timezone.
 */
function getCurrentTimeComponents(
  now: Date,
  timezone: string,
): { hour: number; minute: number } {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now),
    10,
  );
  const minute = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      minute: "numeric",
    }).format(now),
    10,
  );
  return { hour, minute };
}

/**
 * Evaluate whether the reporting deadline has passed.
 *
 * Pure function — receives `now` for testability.
 * The deadline includes the grace period: overdue only when
 * (current time) >= (deadline + grace period).
 *
 * @param now - The current Date (or injected for testing)
 * @returns Evaluation result with overdue flag, config, and overdue-since timestamp
 */
export function evaluateDeadline(now: Date = new Date()): {
  isOverdue: boolean;
  deadlineHour: number;
  deadlineMinute: number;
  overdueSince: Date | null;
} {
  const config = getComplianceConfig();
  // UTC is authoritative for deadline comparison
  const { hour: currentHour, minute: currentMinute } = getCurrentTimeComponents(
    now,
    "UTC",
  );

  // Calculate total minutes from midnight for comparison
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const deadlineTotalMinutes =
    config.deadlineHour * 60 + config.deadlineMinute;
  const effectiveDeadlineTotalMinutes =
    deadlineTotalMinutes + config.gracePeriodMinutes;

  const isOverdue = currentTotalMinutes >= effectiveDeadlineTotalMinutes;

  // Calculate the exact moment overdue status began (for duration display)
  let overdueSince: Date | null = null;
  if (isOverdue) {
    // overdueSince = today at (deadline + grace) in UTC
    const businessDate = getBusinessDate("UTC");
    const effectiveHour = Math.floor(effectiveDeadlineTotalMinutes / 60);
    const effectiveMinute = effectiveDeadlineTotalMinutes % 60;
    overdueSince = new Date(
      `${businessDate}T${String(effectiveHour).padStart(2, "0")}:${String(effectiveMinute).padStart(2, "0")}:00Z`,
    );
  }

  return {
    isOverdue,
    deadlineHour: config.deadlineHour,
    deadlineMinute: config.deadlineMinute,
    overdueSince,
  };
}

/**
 * Calculate the overdue duration in minutes from a timestamp.
 *
 * @param overdueSince - The Date when overdue status began
 * @param now - Current time
 * @returns Duration in minutes
 */
export function getOverdueDurationMinutes(
  overdueSince: Date,
  now: Date = new Date(),
): number {
  const diffMs = now.getTime() - overdueSince.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

// ============================================
// Database Query Functions
// ============================================

/**
 * Check if the current user has submitted today's report.
 * Lightweight boolean check — used by the partner sidebar.
 *
 * @returns true if today's report exists, false otherwise
 */
export async function hasSubmittedTodayReport(): Promise<boolean> {
  const supabase = await createClient();
  const timezone = process.env.PROGRAM_TIMEZONE || "Asia/Kolkata";
  const todayBusinessDate = getBusinessDate(timezone);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return true; // auth handles access; don't block UI

  const { data } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("partner_id", user.id)
    .eq("report_date", todayBusinessDate)
    .maybeSingle();

  return !!data;
}

/**
 * Get the compliance status for the current partner.
 * Returns status, deadline info, and overdue duration.
 */
export async function getPartnerComplianceStatus(): Promise<PartnerComplianceStatus> {
  const now = new Date();
  const { isOverdue, deadlineHour, deadlineMinute, overdueSince } =
    evaluateDeadline(now);
  const submitted = await hasSubmittedTodayReport();

  let overdueDuration: string | null = null;
  if (isOverdue && !submitted && overdueSince) {
    const durationMinutes = getOverdueDurationMinutes(overdueSince, now);
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    if (hours === 0) {
      overdueDuration = `${mins}m`;
    } else if (mins === 0) {
      overdueDuration = `${hours}h`;
    } else {
      overdueDuration = `${hours}h ${mins}m`;
    }
  }

  return {
    status: submitted ? "submitted" : isOverdue ? "overdue" : "pending",
    isOverdue,
    deadline_hour: deadlineHour,
    deadline_minute: deadlineMinute,
    overdue_duration: overdueDuration,
  };
}

/**
 * Compute the full compliance dashboard data.
 * Called from admin page. Uses 2 queries total (no N+1).
 *
 * @returns Complete compliance summary with per-partner records
 */
export async function getComplianceSummary(): Promise<ComplianceSummary> {
  const supabase = await createClient();
  const now = new Date();
  const config = getComplianceConfig();
  const todayBusinessDate = getBusinessDate(config.timezone);
  const { isOverdue, deadlineHour, deadlineMinute, overdueSince } =
    evaluateDeadline(now);

  // Fetch all active partners with profile data
  const { data: partners, error: partnersError } = await supabase
    .from("partners")
    .select(
      `
        id,
        company_id,
        profiles!inner ( full_name, email )
      `,
    )
    .eq("status", "active");

  if (partnersError) {
    console.error("Failed to fetch partners for compliance:", partnersError.message);
    return {
      total_active_partners: 0,
      submitted_count: 0,
      pending_count: 0,
      overdue_count: 0,
      compliance_percentage: 0,
      partners: [],
      deadline_display: `${deadlineHour}:${String(deadlineMinute).padStart(2, "0")}`,
      grace_period_minutes: config.gracePeriodMinutes,
    };
  }

  if (!partners || partners.length === 0) {
    return {
      total_active_partners: 0,
      submitted_count: 0,
      pending_count: 0,
      overdue_count: 0,
      compliance_percentage: 0,
      partners: [],
      deadline_display: `${deadlineHour}:${String(deadlineMinute).padStart(2, "0")}`,
      grace_period_minutes: config.gracePeriodMinutes,
    };
  }

  // Fetch all today's reports in ONE query
  const partnerIds = partners.map((p) => p.id);
  const { data: todayReports, error: reportsError } = await supabase
    .from("daily_reports")
    .select("partner_id, created_at")
    .eq("report_date", todayBusinessDate)
    .in("partner_id", partnerIds);

  if (reportsError) {
    console.error("Failed to fetch reports for compliance:", reportsError.message);
  }

  // Build a map of submitted partner IDs → submission timestamps
  const submittedMap = new Map<string, string>();
  for (const report of todayReports ?? []) {
    submittedMap.set(report.partner_id, report.created_at);
  }

  let submitted_count = 0;
  let pending_count = 0;
  let overdue_count = 0;

  const partnerRecords: PartnerComplianceRecord[] = partners.map((p) => {
    const profile = p.profiles as unknown as {
      full_name: string;
    };

    let status: ReportStatus;
    let submittedAt: string | null = null;
    let overdueDurationMin: number | null = null;

    if (submittedMap.has(p.id)) {
      status = "submitted";
      submittedAt = submittedMap.get(p.id) ?? null;
      submitted_count++;
    } else if (isOverdue) {
      status = "overdue";
      overdue_count++;
      if (overdueSince) {
        overdueDurationMin = getOverdueDurationMinutes(overdueSince, now);
      }
    } else {
      status = "pending";
      pending_count++;
    }

    return {
      partner_id: p.id,
      full_name: profile.full_name,
      company_id: p.company_id,
      report_status: status,
      submitted_at: submittedAt,
      overdue_duration_minutes: overdueDurationMin,
    };
  });

  const total_active_partners = partners.length;
  const compliance_percentage =
    total_active_partners > 0
      ? Math.round((submitted_count / total_active_partners) * 100)
      : 0;

  // Format deadline for display
  const period = deadlineHour >= 12 ? "PM" : "AM";
  const displayHour = deadlineHour % 12 || 12;
  const deadline_display =
    deadlineMinute === 0
      ? `${displayHour}:00 ${period}`
      : `${displayHour}:${String(deadlineMinute).padStart(2, "0")} ${period}`;

  return {
    total_active_partners,
    submitted_count,
    pending_count,
    overdue_count,
    compliance_percentage,
    partners: partnerRecords,
    deadline_display,
    grace_period_minutes: config.gracePeriodMinutes,
  };
}
