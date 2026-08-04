"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  FileText,
  CalendarCheck,
  TrendingUp,
  ClipboardCheck,
  ArrowRight,
  Pin,
  Megaphone,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { DashboardEntrance } from "@/components/loading/dashboard-entrance";
import { formatDeadlineTime, formatDeadlineInTimezone, PROGRAM_TIMEZONE, PIPELINE_COLORS, PIPELINE_LABELS, PIPELINE_STATUSES, getRelativeTimePartner } from "@/components/dashboard/helpers";
import type { PartnerPageData } from "@/components/dashboard/helpers";

/* ═══════════════════════════════════════════════════════════════
   DesktopPartnerDashboard — Original desktop layout, pixel-perfect
   ═══════════════════════════════════════════════════════════════ */

export function DesktopPartnerDashboard({ pageData }: { pageData: PartnerPageData }) {
  const { data, complianceStatus, greeting, firstName, dayOfWeek, monthDay, progressPct, daysRemaining } = pageData;

  return (
    <div className="space-y-6">
      {/* ─── Hero ─── */}
      <DashboardEntrance delay={0}>
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          {greeting}, {firstName}
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[14px] text-[var(--text-3)]">
            {dayOfWeek}, {monthDay}
          </p>
          <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
          <Badge variant={data.programDay > 25 ? "warning" : "info"} className="text-[11px]">
            Day {data.programDay}
          </Badge>
        </div>
      </DashboardEntrance>

      {/* ─── KPI Stat Cards ─── */}
      <DashboardEntrance delay={50} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DesktopStatCard
          icon={<Target className="h-5 w-5 text-[#1A56DB]" />}
          iconBg="bg-[#EFF6FF]"
          value={data.totalLeads}
          label="Total Leads"
          helper={data.totalLeads > 0 ? `${data.totalLeads} assigned` : "No leads yet"}
          href="/partner/leads"
        />
        <DesktopStatCard
          icon={<FileText className="h-5 w-5 text-[#1A56DB]" />}
          iconBg="bg-[#EFF6FF]"
          value={data.totalLeadsContacted}
          label="Leads Contacted"
          helper={
            data.totalLeads > 0
              ? `${Math.round((data.totalLeadsContacted / data.totalLeads) * 100)}% of total`
              : "No data yet"
          }
        />
        <DesktopStatCard
          icon={<CalendarCheck className="h-5 w-5 text-[#D97706]" />}
          iconBg="bg-[#FFFBEB]"
          value={data.totalAppointments}
          label="Appointments"
          helper={data.totalAppointments > 0 ? "Booked" : "None yet"}
        />
        <DesktopStatCard
          icon={<TrendingUp className="h-5 w-5 text-[#059669]" />}
          iconBg="bg-[#ECFDF5]"
          value={data.totalDeals}
          label="Deals Closed"
          helper={data.totalDeals > 0 ? "Closed deals" : "No deals yet"}
        />
      </DashboardEntrance>

      {/* ─── Compliance Banner ─── */}
      {complianceStatus.status === "submitted" ? (
        <div className="surface flex items-center gap-4 p-5 border-l-4 border-l-[var(--status-success)] bg-[#F0FDF4]/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--status-success-bg)] shrink-0">
            <ClipboardCheck className="h-5 w-5 text-[var(--status-success)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[var(--text-1)]">Report Submitted</p>
            <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
              {data.todayReport?.leads_contacted} contacted, {data.todayReport?.appointments_booked} appointments, {data.todayReport?.deals_closed} deals
            </p>
          </div>
          <Link href="/partner/report" className="shrink-0">
            <Button variant="secondary" size="sm">View Report</Button>
          </Link>
        </div>
      ) : complianceStatus.status === "pending" ? (
        <div className="surface flex items-center gap-4 p-5 border-l-4 border-l-[var(--status-warning)] bg-[var(--status-warning-bg)]/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--status-warning-bg)] shrink-0">
            <AlertTriangle className="h-5 w-5 text-[var(--status-warning)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[var(--text-1)]">Daily Report Required</p>
            <div className="mt-0.5 text-[12px]">
              <p className="text-[var(--text-3)]">Submit before</p>
              {complianceStatus.deadline_hour !== undefined && complianceStatus.deadline_minute !== undefined && (
                <>
                  <p className="text-[var(--text-1)] font-medium tabular-nums">
                    {formatDeadlineTime(complianceStatus.deadline_hour, complianceStatus.deadline_minute)} UTC
                  </p>
                  <p className="text-[var(--text-3)]">
                    ({formatDeadlineInTimezone(complianceStatus.deadline_hour, complianceStatus.deadline_minute, PROGRAM_TIMEZONE)} local)
                  </p>
                </>
              )}
            </div>
          </div>
          <Link href="/partner/report" className="shrink-0">
            <Button variant="primary" size="sm">
              Submit Report
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="surface flex items-center gap-4 p-5 border-l-4 border-l-[var(--status-danger)] bg-[var(--status-danger-bg)]/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--status-danger-bg)] shrink-0">
            <Clock className="h-5 w-5 text-[var(--status-danger)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[var(--text-1)]">Today&apos;s report is overdue</p>
            <p className="mt-0.5 text-[12px] text-[var(--status-danger)]">
              {complianceStatus.overdue_duration ? `Overdue by ${complianceStatus.overdue_duration}` : "Please submit immediately"}
            </p>
          </div>
          <Link href="/partner/report" className="shrink-0">
            <Button variant="primary" size="sm" className="bg-[var(--status-danger)] hover:bg-[var(--status-danger)]/90">
              Submit Report Now
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* ─── Program Progress ─── */}
      <DashboardEntrance delay={150} className="surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)] mb-2">
              Program Progress
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-[32px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
                Day {data.programDay}
              </span>
              <span className="text-[13px] text-[var(--text-3)]">
                of 30 · {daysRemaining} days remaining
              </span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent-light)]">
            <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
          </div>
        </div>

        <div className="relative mb-1.5">
          <div className="flex justify-between text-[10px] text-[var(--text-3)] tabular-nums px-0.5">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day 30</span>
          </div>
        </div>

        <div className="relative h-2 w-full rounded-full bg-[var(--border-subtle)]">
          <div
            className="dashboard-progress-fill h-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--status-success)]"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
            style={{ left: `${(10 / 30) * 100}%`, backgroundColor: data.programDay >= 10 ? "var(--accent)" : "var(--border)" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
            style={{ left: `${(20 / 30) * 100}%`, backgroundColor: data.programDay >= 20 ? "var(--accent)" : "var(--border)" }}
          />
        </div>
      </DashboardEntrance>

      {/* ─── Lead Pipeline ─── */}
      <DashboardEntrance delay={200} className="surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)] mb-1">
              Lead Pipeline
            </p>
            <p className="text-[13px] text-[var(--text-2)]">
              {data.totalLeads} total leads
            </p>
          </div>
          <Link href="/partner/leads" className="group flex items-center gap-1 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-150">
            View all
            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {data.totalLeads === 0 ? (
          <div className="py-8 text-center">
            <Target className="h-6 w-6 mx-auto text-[var(--text-3)] opacity-40 mb-2" />
            <p className="text-[13px] text-[var(--text-3)]">No leads assigned yet</p>
          </div>
        ) : (
          <>
            <div className="h-2.5 w-full rounded-full bg-[var(--border-subtle)] flex overflow-hidden mb-5">
              {PIPELINE_STATUSES.map((status) => {
                const count = status === "not_contacted"
                  ? Math.max(0, data.totalLeads - data.totalLeadsContacted)
                  : status === "contacted"
                    ? Math.max(0, data.totalLeadsContacted - data.totalAppointments)
                    : status === "appointment_booked"
                      ? data.totalAppointments
                      : status === "closed"
                        ? data.totalDeals
                        : 0;
                const pct = data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={status}
                    className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: PIPELINE_COLORS[status] }}
                    title={`${PIPELINE_LABELS[status]}: ${count}`}
                  />
                );
              })}
            </div>

            <div className="space-y-3">
              {PIPELINE_STATUSES.map((status) => {
                const count = status === "not_contacted"
                  ? Math.max(0, data.totalLeads - data.totalLeadsContacted)
                  : status === "contacted"
                    ? Math.max(0, data.totalLeadsContacted - data.totalAppointments)
                    : status === "appointment_booked"
                      ? data.totalAppointments
                      : status === "closed"
                        ? data.totalDeals
                        : 0;
                const pct = data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="text-[12px] text-[var(--text-2)] w-28 shrink-0">
                      {PIPELINE_LABELS[status]}
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: PIPELINE_COLORS[status] }}
                      />
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text-1)] tabular-nums w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DashboardEntrance>

      {/* ─── Two-Column: Announcements + Activity ─── */}
      <DashboardEntrance delay={250} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-3 surface">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[var(--text-3)]" />
              <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Announcements</h2>
            </div>
            <Link href="/partner/announcements" className="group flex items-center gap-1 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-150">
              View all
              <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {data.announcements.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Megaphone className="h-6 w-6 mx-auto text-[var(--text-3)] opacity-40 mb-2" />
              <p className="text-[13px] text-[var(--text-3)]">No announcements yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {data.announcements.map((announcement) => (
                <div key={announcement.id} className="px-5 py-3.5 hover:bg-[var(--hover-bg)] transition-colors duration-150">
                  <div className="flex items-center gap-2 mb-0.5">
                    {announcement.is_pinned && (
                      <Pin className="h-3 w-3 text-[var(--accent)] shrink-0" />
                    )}
                    <p className="text-[13px] font-medium text-[var(--text-1)] leading-snug truncate">
                      {announcement.title}
                    </p>
                    {announcement.is_pinned && (
                      <Badge variant="info" className="text-[10px] shrink-0">Pinned</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] tabular-nums">
                    {getRelativeTimePartner(announcement.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 surface">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Recent Activity</h2>
          </div>

          <div className="px-5 py-4 space-y-4">
            <DesktopActivityItem color="var(--accent)" text={`Day ${data.programDay} of program`} time="Today" />
            {data.todayReport && (
              <DesktopActivityItem color="var(--status-success)" text="Daily report submitted" time={getRelativeTimePartner(data.todayReport.created_at)} />
            )}
            {data.totalReports > 0 && (
              <DesktopActivityItem color="#1A56DB" text={`${data.totalReports} reports submitted`} time="All time" />
            )}
            {data.announcements.slice(0, 2).map((a) => (
              <DesktopActivityItem key={a.id} color={a.is_pinned ? "var(--accent)" : "var(--text-3)"} text={`New announcement: ${a.title}`} time={getRelativeTimePartner(a.created_at)} />
            ))}
            {data.totalLeads > 0 && (
              <DesktopActivityItem color="#059669" text={`${data.totalLeads} leads assigned to you`} time="All time" />
            )}
          </div>
        </div>
      </DashboardEntrance>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Local Components
   ═══════════════════════════════════════════════════════════════ */

function DesktopStatCard({
  icon,
  iconBg,
  value,
  label,
  helper,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  helper: string;
  href?: string;
}) {
  const content = (
    <div className="surface p-4 h-full hover:shadow-[var(--shadow-2)] hover:border-[#D1D5DB] transition-all duration-150">
      <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${iconBg} mb-3`}>
        {icon}
      </div>
      <p className="text-[24px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-[var(--text-2)]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
        {helper}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

function DesktopActivityItem({ color, text, time }: { color: string; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text-1)] leading-snug">{text}</p>
        <p className="text-[11px] text-[var(--text-3)] tabular-nums mt-0.5">{time}</p>
      </div>
    </div>
  );
}
