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
import { useAdminGreeting } from "@/components/dashboard/admin/use-admin-greeting";
import { DashboardEntrance } from "@/components/loading/dashboard-entrance";
import { formatDeadlineTime, PIPELINE_COLORS, PIPELINE_LABELS, PIPELINE_STATUSES, getRelativeTimePartner } from "@/components/dashboard/helpers";
import { DueLine } from "@/components/dashboard/use-viewer-deadline";
import type { PartnerPageData } from "@/components/dashboard/helpers";

/* ═══════════════════════════════════════════════════════════════
   DesktopPartnerDashboard — Original desktop layout, pixel-perfect
   ═══════════════════════════════════════════════════════════════ */

export function DesktopPartnerDashboard({ pageData }: { pageData: PartnerPageData }) {
  const { data, complianceStatus, greeting, firstName, dayOfWeek, monthDay, progressPct, daysRemaining } = pageData;
  // Browser-local greeting; falls back to the server-rendered greeting
  // (PROGRAM_TIMEZONE) until hydration so first paint never flashes.
  const localGreeting = useAdminGreeting();
  const hasAnnouncements = data.announcements.length > 0;
  const hasActivity = !!data.todayReport || hasAnnouncements;

  return (
    <div className="space-y-6">
      {/* ─── Hero ─── */}
      <DashboardEntrance delay={0}>
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          {localGreeting ?? greeting}, {firstName}
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
          icon={<Target className="h-5 w-5 text-[var(--text-2)]" />}
          iconBg="bg-[var(--hover-bg)]"
          value={data.totalLeads}
          label="Total Leads"
          helper={data.totalLeads > 0 ? `${data.totalLeads} assigned` : "No leads yet"}
          href="/partner/leads"
        />
        <DesktopStatCard
          icon={<FileText className="h-5 w-5 text-[var(--text-2)]" />}
          iconBg="bg-[var(--hover-bg)]"
          value={data.totalLeadsContacted}
          label="Leads Contacted"
          helper={
            data.totalLeads > 0
              ? `${Math.round((data.totalLeadsContacted / data.totalLeads) * 100)}% of total`
              : "No data yet"
          }
        />
        <DesktopStatCard
          icon={<CalendarCheck className="h-5 w-5 text-[var(--text-2)]" />}
          iconBg="bg-[var(--hover-bg)]"
          value={data.totalAppointments}
          label="Appointments"
          helper={data.totalAppointments > 0 ? "Booked" : "None yet"}
        />
        <DesktopStatCard
          icon={<TrendingUp className="h-5 w-5 text-[var(--text-2)]" />}
          iconBg="bg-[var(--hover-bg)]"
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
            {complianceStatus.deadline_hour !== undefined && complianceStatus.deadline_minute !== undefined && (
              <p className="mt-0.5 text-[12px] text-[var(--text-3)] tabular-nums">
                Due {formatDeadlineTime(complianceStatus.deadline_hour, complianceStatus.deadline_minute)} UTC ·{" "}
                <DueLine utcHour={complianceStatus.deadline_hour} utcMinute={complianceStatus.deadline_minute} />
              </p>
            )}
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
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--hover-bg)]">
            <TrendingUp className="h-5 w-5 text-[var(--text-2)]" />
          </div>
        </div>

        {/* Scale: every mark uses day/total (Day N sits at N/30), matching
            the loaded progressPct prop. Ticks + labels + fill + today dot. */}
        <div className="relative mb-1.5 h-3 text-[10px] text-[var(--text-3)] tabular-nums px-0.5" aria-hidden="true">
          <span className="absolute -translate-x-1/2" style={{ left: `${(1 / 30) * 100}%` }}>Day 1</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${(10 / 30) * 100}%` }}>Day 10</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${(20 / 30) * 100}%` }}>Day 20</span>
          <span className="absolute right-0.5">Day 30</span>
        </div>

        <div
          className="relative h-2 w-full rounded-full bg-[var(--border-subtle)]"
          role="progressbar"
          aria-valuenow={data.programDay}
          aria-valuemin={0}
          aria-valuemax={30}
          aria-label={`Program progress: day ${data.programDay} of 30`}
        >
          <div
            className="h-2 rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-3)]"
            style={{ left: `${(1 / 30) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-3)]"
            style={{ left: `${(10 / 30) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-3)]"
            style={{ left: `${(20 / 30) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--accent)]"
            style={{ left: `${Math.min(100, (data.programDay / 30) * 100)}%` }}
            title={`Today: Day ${data.programDay}`}
          />
        </div>
      </DashboardEntrance>

      {/* ─── Lead Pipeline ─── */}
      <DashboardEntrance delay={200} className="surface p-5">
        <div className="flex items-center justify-between mb-1">
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
        {Math.max(0, data.totalLeads - data.totalLeadsContacted) > 0 && (
          <Link
            href="/partner/leads?status=not_contacted"
            className="mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 rounded-[4px]"
          >
            {Math.max(0, data.totalLeads - data.totalLeadsContacted)} lead{Math.max(0, data.totalLeads - data.totalLeadsContacted) !== 1 ? "s" : ""} waiting for first contact
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}

        {data.totalLeads === 0 ? (
          <div className="py-8 text-center">
            <Target className="h-6 w-6 mx-auto text-[var(--text-3)] opacity-40 mb-2" />
            <p className="text-[13px] text-[var(--text-3)]">No leads assigned yet</p>
          </div>
        ) : (
          <div className="space-y-1">
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
                <Link
                  key={status}
                  href={`/partner/leads?status=${status}`}
                  aria-label={`${PIPELINE_LABELS[status]}: ${count} leads. View in My Leads.`}
                  className={`group flex min-h-[44px] items-center gap-3 rounded-[8px] px-2 -mx-2 py-1.5 transition-colors duration-150 hover:bg-[var(--hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px] md:min-h-0`}
                >
                  <div className="text-[12px] text-[var(--text-2)] w-28 shrink-0 group-hover:text-[var(--text-1)]">
                    {PIPELINE_LABELS[status]}
                  </div>
                  <div className="flex-1 max-w-[440px] h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${pct}%`, backgroundColor: PIPELINE_COLORS[status] }}
                    />
                  </div>
                  <span className="text-[12px] font-medium tabular-nums w-8 text-left text-[var(--text-2)]">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </DashboardEntrance>

      {/* ─── Announcements + Activity: only real content renders ─── */}
      <DashboardEntrance delay={250} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {hasAnnouncements && (
        /* Announcements */
        <div className={`${hasActivity ? "lg:col-span-3" : "lg:col-span-5"} surface`}>
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
        </div>
        )}

        {hasActivity ? (
        /* Activity — only real events */
        <div className={`${hasAnnouncements ? "lg:col-span-2" : "lg:col-span-5"} surface`}>
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Recent Activity</h2>
          </div>

          <div className="px-5 py-4 space-y-4">
            {data.todayReport && (
              <DesktopActivityItem color="var(--status-success)" text="Daily report submitted" time={getRelativeTimePartner(data.todayReport.created_at)} />
            )}
            {data.announcements.slice(0, 2).map((a) => (
              <DesktopActivityItem key={a.id} color={a.is_pinned ? "var(--accent)" : "var(--text-3)"} text={`New announcement: ${a.title}`} time={getRelativeTimePartner(a.created_at)} />
            ))}
          </div>
        </div>
        ) : (
        /* Nothing real anywhere — one slim strip instead of two empty cards */
        <div className="surface flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 lg:col-span-5">
          <p className="text-[13px] text-[var(--text-2)]">Nothing new right now.</p>
          <Link href="/partner/announcements" className="group inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-150">
            View announcements
            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
        )}
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
    <div className={`surface p-4 h-full transition-all duration-150 ${href ? "hover:shadow-[var(--shadow-2)] hover:border-[#D1D5DB]" : ""}`}>
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
