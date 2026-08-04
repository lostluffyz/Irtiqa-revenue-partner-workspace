import { requirePartner, getProgramDay, calculateStreak } from "@/lib/partner";
import {
  getProgramStatus,
  getBusinessDate,
  PROGRAM_DURATION_DAYS,
} from "@/lib/program-timezone";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  Milestone,
} from "lucide-react";
import { redirect } from "next/navigation";
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
  { key: "closed", label: "Closed", color: "bg-emerald-700" },
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
  const milestones = [25, 50, 75, 100] as const;
  const currentMilestone = milestones.find((m) => progressPct >= m) ?? null;

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
      <div className="mb-8">
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
                <Flame className="h-3.5 w-3.5 text-[#F59E0B]" />
                {streak} day{streak !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-[12px] text-[var(--text-3)] tabular-nums">
              {programStatus.daysRemaining} day{programStatus.daysRemaining !== 1 ? "s" : ""} left
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--border-subtle)]">
          <div
            className="h-1.5 rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {currentMilestone && currentMilestone < PROGRAM_DURATION_DAYS && (
          <p className="mt-2 text-[11px] text-[var(--status-success)] font-medium">
            {currentMilestone === 25 && "Quarter of the way there"}
            {currentMilestone === 50 && "Halfway through the program"}
            {currentMilestone === 75 && "Three quarters complete"}
          </p>
        )}
      </div>

      {/* ═══ Daily Performance ═══ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-3.5 w-3.5 text-[var(--text-3)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
            Daily Averages
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <PerformanceCard
            icon={Target}
            iconBg="bg-[var(--accent)]/10 text-[var(--accent)]"
            value={avgContacted}
            label="Leads / day"
            trend={hasReports ? contactedTrend : null}
          />
          <PerformanceCard
            icon={CalendarCheck}
            iconBg="bg-emerald-50 text-emerald-600"
            value={avgAppointments}
            label="Appointments / day"
            trend={hasReports ? apptsTrend : null}
          />
          <PerformanceCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50 text-emerald-700"
            value={avgDeals}
            label="Deals / day"
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
                accentColor="bg-emerald-500"
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
                accentColor="bg-emerald-700"
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
              {/* Stacked bar */}
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[var(--border-subtle)] mb-4">
                {PIPELINE_STATUSES.map(({ key, color }) => {
                  const count = statusBreakdown[key] || 0;
                  if (count === 0) return null;
                  const width = (count / activeLeads) * 100;
                  return (
                    <div
                      key={key}
                      className={`${color} transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2.5">
                {PIPELINE_STATUSES.map(({ key, label, color }) => {
                  const count = statusBreakdown[key] || 0;
                  if (count === 0) return null;
                  const pct = Math.round((count / activeLeads) * 100);
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                        <span className="text-[12px] text-[var(--text-2)]">{label}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--text-1)] tabular-nums">
                        {count}{" "}
                        <span className="font-normal text-[var(--text-3)]">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Contextual insight */}
              {(statusBreakdown.follow_up_required || 0) > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <p className="text-[11px] text-[var(--status-warning)] font-medium">
                    {statusBreakdown.follow_up_required} lead{statusBreakdown.follow_up_required !== 1 ? "s" : ""} waiting for follow-up
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="surface p-8 text-center">
              <p className="text-[13px] text-[var(--text-3)]">
                No active leads in pipeline.
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
  trend,
}: {
  icon: React.ElementType;
  iconBg: string;
  value: string;
  label: string;
  trend: { pct: number; direction: "up" | "down" | "neutral"; isNew?: boolean } | null;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center ${iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
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
      </div>
      <p className="text-[24px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-[var(--text-3)]">
        {label}
      </p>
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
