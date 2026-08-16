import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import {
  getProgramDay,
  getBusinessDate,
  formatDeadlineTime,
  formatDuration,
  getPartnerTimezone,
  formatDeadlineInTimezone,
  getTimezoneLabel,
  getUTCOffset,
} from "@/lib/program-timezone";
import { calculateStreak } from "@/lib/partner";
import {
  evaluateDeadline,
  getOverdueDurationMinutes,
  getComplianceConfig,
  type ReportStatus,
} from "@/lib/compliance";
import { getPartnerAllocationState, type AllocationState, type AllocationBatchRow } from "@/lib/allocation";
import { PartnerDetail } from "./partner-detail";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface PartnerData {
  id: string;
  company_id: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  phone: string | null;
  program_start_date: string;
  region_id: string | null;
  profiles: { full_name: string; email: string } | null;
  regions: { id: string; name: string } | null;
}

interface LeadData {
  id: string;
  company_name: string;
  email: string | null;
  status: string;
  assigned_at: string | null;
}

interface ReportData {
  id: string;
  report_date: string;
  leads_contacted: number;
  appointments_booked: number;
  deals_closed: number;
  biggest_challenge: string | null;
}

interface ActivityData {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════
   Data Fetching
   ═══════════════════════════════════════════════════════════════ */

async function getPartnerData(id: string) {
  const supabase = await createClient();
  const now = new Date();

  // Parallel fetch: partner, leads, reports, activity
  const [partnerResult, leadsResult, reportsResult, activityResult] =
    await Promise.all([
      supabase
        .from("partners")
        .select(
          `
            *,
            profiles!inner(id, full_name, email),
            regions!left(id, name)
          `,
        )
        .eq("id", id)
        .single(),
      supabase
        .from("leads")
        .select("id, company_name, email, status, assigned_at")
        .eq("assigned_to", id)
        .order("assigned_at", { ascending: false }),
      supabase
        .from("daily_reports")
        .select("*")
        .eq("partner_id", id)
        .order("report_date", { ascending: false }),
      supabase
        .from("partner_activity_log")
        .select("*")
        .eq("partner_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Partner not found
  if (partnerResult.error || !partnerResult.data) {
    notFound();
  }

  const partner = partnerResult.data as PartnerData;
  const leads = (leadsResult.data || []) as LeadData[];
  const reports = (reportsResult.data || []) as ReportData[];
  const activity = (activityResult.data || []) as ActivityData[];

  // Compute stats
  const totalAppointments = reports.reduce(
    (sum, r) => sum + r.appointments_booked,
    0,
  );
  const totalDeals = reports.reduce((sum, r) => sum + r.deals_closed, 0);

  // Program day & streak
  const programDay = getProgramDay(partner.program_start_date);
  const streak = await calculateStreak(supabase, partner.id);

  // Allocation state
  const { state: allocationState, batches: allocationBatches } = await getPartnerAllocationState(adminClient, partner.id);

  // Compliance status for this partner
  const config = getComplianceConfig();
  const { isOverdue, deadlineHour, deadlineMinute, overdueSince } =
    evaluateDeadline(now);

  // Resolve partner timezone from region
  const regionName = partner.regions?.name ?? null;
  const partnerTz = getPartnerTimezone(regionName);

  // Check if partner submitted today's report
  const today = getBusinessDate(config.timezone);
  const todayReport = reports.find((r) => r.report_date === today);
  const status: ReportStatus = todayReport
    ? "submitted"
    : isOverdue
      ? "overdue"
      : "pending";

  const overdueDuration =
    status === "overdue" && overdueSince
      ? formatDuration(getOverdueDurationMinutes(overdueSince, now))
      : null;

  // Reports this month
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const reportsThisMonth = reports.filter((r) => {
    const d = new Date(r.report_date + "T00:00:00Z");
    return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
  }).length;

  // Days elapsed this month (for compliance %)
  const firstOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
  const daysElapsed = Math.min(
    Math.floor(
      (now.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1,
    now.getUTCDate(),
  );

  return {
    partner,
    leads,
    reports,
    activity,
    stats: {
      leadCount: leads.length,
      reportCount: reports.length,
      totalAppointments,
      totalDeals,
    },
    compliance: {
      status,
      deadlineDisplay: formatDeadlineTime(deadlineHour, deadlineMinute),
      isOverdue,
      overdueDuration,
      reportsThisMonth,
      totalDaysInMonth: daysElapsed,
      // Dual timezone display data
      deadlineUTC: formatDeadlineTime(deadlineHour, deadlineMinute),
      deadlineLocal: formatDeadlineInTimezone(deadlineHour, deadlineMinute, partnerTz),
      deadlineUTCTimezone: "UTC",
      deadlineLocalTimezone: getTimezoneLabel(partnerTz),
      partnerTimezone: partnerTz,
      partnerTimezoneOffset: getUTCOffset(partnerTz),
      partnerTimezoneLabel: getTimezoneLabel(partnerTz),
    },
    programDay,
    streak,
    allocationState,
    allocationBatches,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════ */

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const data = await getPartnerData(id);

  return <PartnerDetail {...data} />;
}
