import { requirePartner, getProgramDay, calculateStreak } from "@/lib/partner";
import {
  getProgramStatus,
  getBusinessDate,
  PROGRAM_DURATION_DAYS,
} from "@/lib/program-timezone";
import { getProgressMilestoneCopy } from "@/components/dashboard/helpers";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Milestone,
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Lead } from "@/types/database";

// ============================================
// Helpers
// ============================================

function computeTrend(current: number, previous: number) {
  if (previous === 0 && current === 0) return { pct: 0, direction: "neutral" as const, isNew: false };
  if (previous === 0 && current > 0) return { pct: 0, direction: "up" as const, isNew: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    pct: Math.abs(pct),
    direction: (pct > 0 ? "up" : pct < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
    isNew: false,
  };
}

// ============================================
// Pipeline Constants
// ============================================

const PIPELINE_STATUSES = [
  { key: "contacted", label: "Contacted", color: "bg-[var(--accent)]" },
  { key: "follow_up_required", label: "Follow Up", color: "bg-[var(--status-warning)]" },
  { key: "appointment_booked", label: "Appointments", color: "bg-[var(--status-success)]" },
  { key: "closed", label: "Closed", color: "bg-[var(--status-success)]" },
];

// ============================================
// Page
// ============================================

export default async function PartnerProgressPage() {
  const { partner, supabase } = await requirePartner().catch(() => {
    throw redirect("/login");
  });

  const programDay = getProgramDay(partner.program_start_date);
  const streak = await calculateStreak(supabase, partner.id);
  const programStatus = getProgramStatus(partner.program_start_date);
  const today = getBusinessDate();
  const progressPct = Math.min(100, (programDay / PROGRAM_DURATION_DAYS) * 100);

  // ── Leads ──
  const { data: leadData } = await supabase
    .from("leads")
    .select("status")
    .eq("assigned_to", partner.id);

  const leads = (leadData || []) as Pick<Lead, "status">[];
  const totalLeads = leads.length;

  const statusBreakdown: Record<string, number> = {};
  for (const lead of leads) {
    statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1;
  }

  const activeStatuses = ["contacted", "follow_up_required", "appointment_booked", "closed"];
  const activeLeads = activeStatuses.reduce((sum, s) => sum + (statusBreakdown[s] || 0), 0);

  // ── Reports (last 14 days for trends) ──
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoffDate = fourteenDaysAgo.toISOString().split("T")[0];

  const { data: recentReports } = await supabase
    .from("daily_reports")
    .select("leads_contacted, appointments_booked, deals_closed, report_date")
    .eq("partner_id", partner.id)
    .gte("report_date", cutoffDate)
    .order("report_date", { ascending: true });

  const reports = recentReports || [];

  const totalReportsResult = await supabase
    .from("daily_reports")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id);
  const totalReports = totalReportsResult.count || 0;

  // ── All-time totals ──
  const { data: allReportData } = await supabase
    .from("daily_reports")
    .select("leads_contacted, appointments_booked, deals_closed")
    .eq("partner_id", partner.id);

  const allReports = allReportData || [];
  const totalContacted = allReports.reduce((s, r) => s + (r.leads_contacted || 0), 0);
  const totalAppointments = allReports.reduce((s, r) => s + (r.appointments_booked || 0), 0);
  const totalDeals = allReports.reduce((s, r) => s + (r.deals_closed || 0), 0);

  // ── Daily averages ──
  const avgContacted = totalReports > 0 ? (totalContacted / totalReports).toFixed(1) : "0";
  const avgAppointments = totalReports > 0 ? (totalAppointments / totalReports).toFixed(1) : "0";
  const avgDeals = totalReports > 0 ? (totalDeals / totalReports).toFixed(1) : "0";

  // ── Week-over-week trends ──
  const todayDate = new Date(today + "T00:00:00Z");
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const fourteenDaysAgoDate = new Date(todayDate);
  fourteenDaysAgoDate.setUTCDate(fourteenDaysAgoDate.getUTCDate() - 14);

  const thisWeek = reports.filter((r) => {
    const d = new Date(r.report_date + "T00:00:00Z");
    return d >= sevenDaysAgo && d <= todayDate;
  });
  const lastWeek = reports.filter((r) => {
    const d = new Date(r.report_date + "T00:00:00Z");
    return d >= fourteenDaysAgoDate && d < sevenDaysAgo;
  });

  const thisWeekContacted = thisWeek.reduce((s, r) => s + (r.leads_contacted || 0), 0);
  const lastWeekContacted = lastWeek.reduce((s, r) => s + (r.leads_contacted || 0), 0);
  const thisWeekAppts = thisWeek.reduce((s, r) => s + (r.appointments_booked || 0), 0);
  const lastWeekAppts = lastWeek.reduce((s, r) => s + (r.appointments_booked || 0), 0);
  const thisWeekDeals = thisWeek.reduce((s, r) => s + (r.deals_closed || 0), 0);
  const lastWeekDeals = lastWeek.reduce((s, r) => s + (r.deals_closed || 0), 0);

  const contactedTrend = computeTrend(thisWeekContacted, lastWeekContacted);
  const apptsTrend = computeTrend(thisWeekAppts, lastWeekAppts);
  const dealsTrend = computeTrend(thisWeekDeals, lastWeekDeals);

  const hasReports = totalReports > 0;
  const hasLeads = totalLeads > 0;

  // ── Milestone ──
  const milestoneCopy = getProgressMilestoneCopy(programDay, PROGRAM_DURATION_DAYS);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="max-w-3xl mx-auto">
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          Progress
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-2)]">
          Your {PROGRAM_DURATION_DAYS}-day partner program at a glance.
        </p>
        <div className="mt-3 h-px bg-[var(--border-subtle)]" />
      </div>

      {/* ═══ Program Status Bar ═══ */}
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] mb-8">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-[var(--text-1)] tabular-nums">
              Day {programDay} of {PROGRAM_DURATION_DAYS}
            </span>
            <span className="text-[12px] text-[var(--text-3)] tabular-nums">
              {progressPct.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-2)]">
                <Flame className="h-3.5 w-3.5 text-[var(--status-warning)]" />
                {streak} day{streak !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-[12px] text-[var(--text-3)] tabular-nums">
              {programStatus.daysRemaining} day{programStatus.daysRemaining !== 1 ? "s" : ""} left
            </span>
          </div>
        </div>
        <div className="relative mb-1.5 h-3 text-[10px] text-[var(--text-3)] tabular-nums" aria-hidden="true">
          <span className="absolute -translate-x-1/2" style={{ left: `${(1 / PROGRAM_DURATION_DAYS) * 100}%` }}>Day 1</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${(10 / PROGRAM_DURATION_DAYS) * 100}%` }}>Day 10</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${(20 / PROGRAM_DURATION_DAYS) * 100}%` }}>Day 20</span>
          <span className="absolute right-0">Day 30</span>
        </div>
        <div
          className="relative h-2 w-full rounded-full bg-[var(--border-subtle)]"
          role="progressbar"
          aria-valuenow={programDay}
          aria-valuemin={0}
          aria-valuemax={PROGRAM_DURATION_DAYS}
          aria-label={`Program progress: day ${programDay} of ${PROGRAM_DURATION_DAYS}`}
        >
          <div
            className="h-2 rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-3)]"
            style={{ left: `${(1 / PROGRAM_DURATION_DAYS) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-3)]"
            style={{ left: `${(10 / PROGRAM_DURATION_DAYS) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-3)]"
            style={{ left: `${(20 / PROGRAM_DURATION_DAYS) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--accent)]"
            style={{ left: `${Math.min(100, (programDay / PROGRAM_DURATION_DAYS) * 100)}%` }}
            title={`Today: Day ${programDay}`}
          />
        </div>
        {milestoneCopy && (
          <p className="mt-2 text-[11px] text-[var(--text-2)] font-medium">
            {milestoneCopy}
          </p>
        )}
      </div>

      {/* ═══ Daily Performance ═══ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-3.5 w-3.5 text-[var(--text-3)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
            Averages Per Report
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PerformanceCard
            icon={Target}
            iconBg="bg-[var(--hover-bg)] text-[var(--text-2)]"
            value={avgContacted}
            label="Contacted"
            caption={`avg per report · across ${totalReports} report${totalReports !== 1 ? "s" : ""}`}
            trend={hasReports ? contactedTrend : null}
          />
          <PerformanceCard
            icon={CalendarCheck}
            iconBg="bg-[var(--hover-bg)] text-[var(--text-2)]"
            value={avgAppointments}
            label="Appointments"
            caption={`avg per report · across ${totalReports} report${totalReports !== 1 ? "s" : ""}`}
            trend={hasReports ? apptsTrend : null}
          />
          <PerformanceCard
            icon={CheckCircle2}
            iconBg="bg-[var(--hover-bg)] text-[var(--text-2)]"
            value={avgDeals}
            label="Deals"
            caption={`avg per report · across ${totalReports} report${totalReports !== 1 ? "s" : ""}`}
            trend={hasReports ? dealsTrend : null}
          />
        </div>
      </div>

      {/* ═══ Empty State ═══ */}
      {!hasLeads && !hasReports && (
        <div className="surface p-12 text-center mb-8">
          <div className="w-12 h-12 rounded-[12px] bg-[var(--canvas)] flex items-center justify-center mx-auto mb-4">
            <Milestone className="h-6 w-6 text-[var(--text-3)] opacity-40" />
          </div>
          <p className="text-[14px] font-semibold text-[var(--text-1)] mb-1.5">
            Your progress will appear here
          </p>
          <p className="text-[13px] text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">
            You&apos;re on day {programDay} of {PROGRAM_DURATION_DAYS}.
            Submit daily reports and work your leads to see performance metrics.
          </p>
        </div>
      )}

      {/* ═══ Conversion Funnel ═══ */}
      {hasLeads && hasReports && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--text-3)]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
              Conversion Funnel
            </p>
          </div>
          <div className="surface p-5">
            <div className="space-y-0">
              <FunnelRow
                label="Contacted"
                count={totalContacted}
                accentColor="bg-[var(--accent)]"
                conversion={
                  totalContacted > 0
                    ? {
                        value: `${Math.round((totalAppointments / totalContacted) * 100)}%`,
                        label: "to appointments",
                      }
                    : null
                }
              />
              <FunnelRow
                label="Appointments"
                count={totalAppointments}
                accentColor="bg-[var(--status-success)]"
                conversion={
                  totalAppointments > 0
                    ? {
                        value: `${Math.round((totalDeals / totalAppointments) * 100)}%`,
                        label: "to closed",
                      }
                    : null
                }
              />
              <FunnelRow
                label="Closed"
                count={totalDeals}
                accentColor="bg-[var(--status-success)]"
                conversion={null}
                isBottom
              />
            </div>
            {/* Overall conversion */}
            {totalContacted > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-3)]">Overall contact → close</span>
                  <span className="text-[12px] font-semibold text-[var(--text-1)] tabular-nums">
                    {totalContacted > 0
                      ? `${((totalDeals / totalContacted) * 100).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Active Pipeline ═══ */}
      {hasLeads && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-[var(--text-3)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                Active Pipeline
              </p>
            </div>
            <span className="text-[12px] text-[var(--text-3)] tabular-nums">
              {activeLeads} active lead{activeLeads !== 1 ? "s" : ""}
            </span>
          </div>

          {activeLeads > 0 ? (
            <div className="surface p-5">
              <div className="space-y-1">
                {PIPELINE_STATUSES.map(({ key, label, color }) => {
                  const count = statusBreakdown[key] || 0;
                  if (count === 0) return null;
                  const pct = Math.round((count / activeLeads) * 100);
                  return (
                    <Link
                      key={key}
                      href={`/partner/leads?status=${key}`}
                      aria-label={`${label}: ${count} leads. View in My Leads.`}
                      className="group flex items-center gap-3 rounded-[8px] px-2 -mx-2 py-1.5 transition-colors duration-150 hover:bg-[var(--hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-[12px] text-[var(--text-2)] group-hover:text-[var(--text-1)] min-w-0 flex-1 truncate">{label}</span>
                      <span className="text-[12px] font-semibold text-[var(--text-1)] tabular-nums whitespace-nowrap">
                        {count}{" "}
                        <span className="font-normal text-[var(--text-3)]">({pct}%)</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Contextual insight */}
              {(statusBreakdown.follow_up_required || 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <p className="text-[11px] text-[var(--status-warning)] font-medium">
                    {statusBreakdown.follow_up_required} lead{statusBreakdown.follow_up_required !== 1 ? "s" : ""} waiting for follow-up
                  </p>
                </div>
              )}
            </div>
          ) : (statusBreakdown.not_contacted || 0) > 0 ? (
            <div className="surface flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5">
              <p className="text-[13px] text-[var(--text-2)]">No leads in progress yet.</p>
              <Link
                href="/partner/leads?status=not_contacted"
                className="group inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 rounded-[4px]"
              >
                {statusBreakdown.not_contacted} waiting for first contact
                <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>
          ) : (
            <div className="surface p-8 text-center">
              <p className="text-[13px] text-[var(--text-3)]">
                No active leads in pipeline yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Performance Card
// ============================================

function PerformanceCard({
  icon: Icon,
  iconBg,
  value,
  label,
  caption,
  trend,
}: {
  icon: React.ElementType;
  iconBg: string;
  value: string;
  label: string;
  caption?: string;
  trend: { pct: number; direction: "up" | "down" | "neutral"; isNew?: boolean } | null;
}) {
  return (
    <div className="surface flex items-center gap-3 p-4 sm:block">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:mb-3 sm:block sm:flex-none">
        <div className={`hidden h-7 w-7 items-center justify-center rounded-[8px] sm:flex ${iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] sm:hidden ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 sm:mt-3">
          <p className="truncate text-[14px] font-semibold text-[var(--text-1)] sm:mt-1.5 sm:text-[12px] sm:font-medium sm:text-[var(--text-3)]">
            {label}
          </p>
          {caption && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--text-3)] tabular-nums sm:text-[11px]">
              {caption}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trend && trend.direction !== "neutral" && (trend.pct > 0 || trend.isNew) && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
              trend.direction === "up" ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.isNew ? "New" : `${trend.pct}%`}
          </span>
        )}
        <p className="text-[24px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================
// Funnel Row
// ============================================

function FunnelRow({
  label,
  count,
  accentColor,
  conversion,
  isBottom,
}: {
  label: string;
  count: number;
  accentColor: string;
  conversion: { value: string; label: string } | null;
  isBottom?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-3 ${
        !isBottom ? "border-b border-[var(--border-subtle)]" : ""
      }`}
    >
      <div className={`w-0.5 h-8 rounded-full ${accentColor} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-medium text-[var(--text-2)]">{label}</span>
          <span className="text-[20px] font-bold text-[var(--text-1)] tabular-nums leading-none">
            {count}
          </span>
        </div>
        {conversion && (
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-[var(--accent)]" />
            <span className="text-[11px] text-[var(--accent)] font-medium tabular-nums">
              {conversion.value}
            </span>
            <span className="text-[11px] text-[var(--text-3)]">{conversion.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
