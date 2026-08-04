/**
 * Dashboard Data Module — Server-only
 *
 * Contains server-side data fetching functions.
 * Client-safe types, constants, and helpers are in ./helpers.ts
 * and are re-exported here for convenience.
 *
 * IMPORTANT: Client components should import from ./helpers.ts directly
 * to avoid pulling server-only code into the client bundle.
 */
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { getProgramDay, PROGRAM_TIMEZONE } from "@/lib/partner";
import { getBusinessDate } from "@/lib/program-timezone";
import { getComplianceSummary, getPartnerComplianceStatus } from "@/lib/compliance";

// Re-export everything from helpers (types, constants, helper functions)
export * from "./helpers";

/* ═══════════════════════════════════════════════════════════════
   Admin Data Fetching
   ═══════════════════════════════════════════════════════════════ */

export async function getAdminDashboardData() {
  const supabase = await createClient();
  const { profile, error } = await getProfile(supabase);

  if (error || !profile) {
    throw new Error("Unauthorized");
  }

  const [totalPartners, activePartners, totalLeads, unassignedLeads, todayReports] = await Promise.all([
    supabase.from("partners").select("id", { count: "exact", head: true }),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).is("assigned_to", null),
    supabase.from("daily_reports").select("id", { count: "exact", head: true }).eq("report_date", getBusinessDate()),
  ]);

  const { data: todayAgg } = await supabase
    .from("daily_reports")
    .select("appointments_booked, deals_closed")
    .eq("report_date", getBusinessDate());

  const appointmentsToday = todayAgg?.reduce((sum, r) => sum + (r.appointments_booked || 0), 0) || 0;

  const { data: recentReports } = await supabase
    .from("daily_reports")
    .select("*, partners!inner(company_id, profiles!inner(full_name))")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentActivity } = await supabase
    .from("partner_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: recentAnnouncements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  const compliance = await getComplianceSummary();

  return {
    counts: {
      totalPartners: totalPartners.count ?? 0,
      activePartners: activePartners.count ?? 0,
      totalLeads: totalLeads.count ?? 0,
      unassignedLeads: unassignedLeads.count ?? 0,
      reportsToday: todayReports.count ?? 0,
      appointmentsToday,
    },
    recentReports: (recentReports || []) as unknown as import("./helpers").ReportWithType[],
    recentActivity: (recentActivity || []) as import("@/types/database").PartnerActivityLog[],
    recentAnnouncements: (recentAnnouncements || []) as import("@/types/database").Announcement[],
    compliance,
    firstName: profile.full_name.split(" ")[0],
  };
}

/* ═══════════════════════════════════════════════════════════════
   Partner Data Fetching
   ═══════════════════════════════════════════════════════════════ */

async function fetchPartnerDashboardData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
  programStartDate: string,
) {
  const programDay = getProgramDay(programStartDate);
  const today = getBusinessDate(PROGRAM_TIMEZONE);

  const [
    { count: totalLeads },
    { data: todayReport },
    { data: allReports },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", partnerId),
    supabase.from("daily_reports").select("*").eq("partner_id", partnerId).eq("report_date", today).maybeSingle(),
    supabase.from("daily_reports").select("leads_contacted, appointments_booked, deals_closed").eq("partner_id", partnerId),
    supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
  ]);

  const totalLeadsContacted = allReports?.reduce((s, r) => s + (r.leads_contacted || 0), 0) || 0;
  const totalAppointments = allReports?.reduce((s, r) => s + (r.appointments_booked || 0), 0) || 0;
  const totalDeals = allReports?.reduce((s, r) => s + (r.deals_closed || 0), 0) || 0;
  const totalReports = allReports?.length || 0;

  return {
    programDay,
    totalLeads: totalLeads || 0,
    todayReport: (todayReport as import("@/types/database").DailyReport | null) || null,
    totalLeadsContacted,
    totalAppointments,
    totalDeals,
    totalReports,
    announcements: (announcements || []) as import("@/types/database").Announcement[],
  };
}

export async function getPartnerPageData() {
  const { requirePartner } = await import("@/lib/partner");
  const { getPartnerGreeting, formatDayOfWeek, formatMonthDay } = await import("./helpers");

  let profile: Awaited<ReturnType<typeof requirePartner>>["profile"];
  let partner: Awaited<ReturnType<typeof requirePartner>>["partner"];
  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    const auth = await requirePartner();
    profile = auth.profile;
    partner = auth.partner;
    supabase = auth.supabase;
  } catch {
    throw new Error("Unauthorized");
  }

  const data = await fetchPartnerDashboardData(supabase, partner.id, partner.program_start_date);
  const complianceStatus = await getPartnerComplianceStatus();
  const today = getBusinessDate(PROGRAM_TIMEZONE);
  const greeting = getPartnerGreeting();
  const firstName = profile.full_name.split(" ")[0] || profile.full_name;
  const dayOfWeek = formatDayOfWeek(today);
  const monthDay = formatMonthDay(today);
  const progressPct = Math.min(100, (data.programDay / 30) * 100);
  const daysRemaining = Math.max(0, 30 - data.programDay);

  return {
    data,
    complianceStatus: {
      status: complianceStatus.status,
      deadline_hour: complianceStatus.deadline_hour,
      deadline_minute: complianceStatus.deadline_minute,
      overdue_duration: complianceStatus.overdue_duration ?? undefined,
    },
    greeting,
    firstName,
    dayOfWeek,
    monthDay,
    today,
    progressPct,
    daysRemaining,
  };
}
