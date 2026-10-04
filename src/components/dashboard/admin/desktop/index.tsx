"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { DashboardEntrance } from "@/components/loading/dashboard-entrance";
import {
  ArrowRight,
  ArrowLeftRight,
  Upload,
  Plus,
  Megaphone,
  Eye,
  FileText,
  Clock,
  Pin,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Users,
  Target,
  CalendarCheck,
  ClipboardCheck,
  StickyNote,
  Globe,
} from "lucide-react";
import type { AdminDashboardData } from "@/components/dashboard/helpers";
import { formatReportDate } from "@/components/dashboard/helpers";
import { useAdminGreeting } from "@/components/dashboard/admin/use-admin-greeting";

/* ═══════════════════════════════════════════════════════════════
   DesktopAdminDashboard — Original desktop layout, pixel-perfect
   ═══════════════════════════════════════════════════════════════ */

function getActivityIcon(action: string): { icon: React.ReactNode; color: string; bg: string } {
  // Distinct glyph per event kind, single neutral tile — color is reserved for status.
  const neutral = { color: "text-[var(--text-2)]", bg: "bg-[var(--hover-bg)]" };
  if (action.includes("lead_notes")) return { icon: <StickyNote className="h-3.5 w-3.5" />, ...neutral };
  if (action.includes("lead")) return { icon: <ArrowLeftRight className="h-3.5 w-3.5" />, ...neutral };
  if (action.includes("report")) return { icon: <ClipboardCheck className="h-3.5 w-3.5" />, ...neutral };
  if (action.includes("partner")) return { icon: <Users className="h-3.5 w-3.5" />, ...neutral };
  if (action.includes("announcement")) return { icon: <Megaphone className="h-3.5 w-3.5" />, ...neutral };
  if (action.includes("allocation")) return { icon: <CalendarCheck className="h-3.5 w-3.5" />, ...neutral };
  if (action.includes("scrape")) return { icon: <Globe className="h-3.5 w-3.5" />, ...neutral };
  return { icon: <Activity className="h-3.5 w-3.5" />, ...neutral };
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
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

export function DesktopAdminDashboard({ data }: { data: AdminDashboardData }) {
  const { counts, recentReports, recentActivity, recentAnnouncements, compliance, firstName } = data;
  const greeting = useAdminGreeting();
  const subtitle =
    counts.reportsToday > 0
      ? `${counts.reportsToday} report${counts.reportsToday !== 1 ? "s" : ""} submitted today · ${counts.activePartners} active partner${counts.activePartners !== 1 ? "s" : ""}.`
      : counts.activePartners > 0
        ? `${counts.activePartners} active partner${counts.activePartners !== 1 ? "s" : ""} · here's what's happening today.`
        : "Here's what's happening with your revenue partners today.";

  return (
    <div className="space-y-6">
      {/* ─── Hero + quick actions ─── */}
      <DashboardEntrance delay={0}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
              <span key={greeting ?? "pending"} className="animate-fade-in inline-block">
                {greeting ?? "\u00A0"}
              </span>
              , {firstName}
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--text-2)] leading-relaxed">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/leads/upload"
              className="inline-flex items-center justify-center gap-2 h-[32px] px-3 rounded-[8px] text-[13px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </Link>
            <Link
              href="/admin/partners/create"
              className="inline-flex items-center justify-center gap-2 h-[32px] px-3 rounded-[8px] text-[13px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Partner
            </Link>
            <Link
              href="/admin/announcements/new"
              className="inline-flex items-center justify-center gap-2 h-[32px] px-3 rounded-[8px] text-[13px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Announcement
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center justify-center gap-2 h-[32px] px-3 rounded-[8px] text-[13px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <Eye className="h-3.5 w-3.5" />
              View Reports
            </Link>
          </div>
        </div>
      </DashboardEntrance>

      {/* ─── KPI Metrics ─── */}
      <DashboardEntrance delay={100} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={<Target className="h-[18px] w-[18px]" />}
          iconColor="text-[var(--text-2)]"
          iconBg="bg-[var(--hover-bg)]"
          value={counts.totalLeads.toLocaleString()}
          label="Total Leads"
          context={`${counts.unassignedLeads} unassigned`}
          contextColor={counts.unassignedLeads > 0 ? "text-[var(--status-warning)]" : "text-[var(--text-3)]"}
        />
        <KpiCard
          icon={<Users className="h-[18px] w-[18px]" />}
          iconColor="text-[var(--text-2)]"
          iconBg="bg-[var(--hover-bg)]"
          value={String(counts.activePartners)}
          label="Active Partners"
          context={`${counts.totalPartners} total`}
        />
        <KpiCard
          icon={<ShieldCheck className="h-[18px] w-[18px]" />}
          iconColor="text-[var(--text-2)]"
          iconBg="bg-[var(--hover-bg)]"
          value={`${compliance.compliance_percentage}%`}
          label="Compliance"
          context={`${compliance.submitted_count}/${compliance.total_active_partners} reported`}
          contextColor={
            compliance.overdue_count > 0
              ? "text-[var(--status-danger)]"
              : compliance.pending_count > 0
                ? "text-[var(--status-warning)]"
                : "text-[var(--text-3)]"
          }
        />
        <KpiCard
          icon={<CalendarCheck className="h-[18px] w-[18px]" />}
          iconColor="text-[var(--text-2)]"
          iconBg="bg-[var(--hover-bg)]"
          value={String(counts.appointmentsToday)}
          label="Appointments"
          context="booked today"
        />
      </DashboardEntrance>

      {/* ─── Unassigned Alert ─── */}
      {counts.unassignedLeads > 0 && (
        <Link
          href="/admin/leads?assignment=unassigned"
          className="flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50/60 px-4 py-3 mb-6 group hover:bg-amber-50 transition-colors duration-150"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-[13px] text-amber-800">
            <span className="font-semibold">{counts.unassignedLeads}</span> lead{counts.unassignedLeads !== 1 ? "s" : ""} waiting for assignment
          </p>
          <span className="ml-auto text-[12px] font-medium text-amber-700 group-hover:text-amber-800 transition-colors duration-150 whitespace-nowrap">
            View →
          </span>
        </Link>
      )}

      {/* ─── Daily Compliance ─── */}
      <DashboardEntrance delay={150} className="surface mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--accent-light)]">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Daily Compliance</h2>
              <p className="text-[12px] text-[var(--text-3)] mt-0.5">
                Deadline: {compliance.deadline_display} UTC
                {compliance.grace_period_minutes > 0 && (
                  <span> ({compliance.grace_period_minutes} min grace)</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
              {compliance.compliance_percentage}%
            </p>
            <p className="text-[11px] text-[var(--text-3)] mt-1">
              {compliance.submitted_count}/{compliance.total_active_partners} partners
            </p>
          </div>
        </div>

        <div
          className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]"
          role="progressbar"
          aria-valuenow={compliance.compliance_percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily compliance progress"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${compliance.compliance_percentage}%` }}
          />
        </div>

        <div className="px-5 py-3 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-[var(--status-success)] shrink-0" />
            <div>
              <p className="text-[18px] font-bold text-[var(--text-1)] tabular-nums leading-none">{compliance.submitted_count}</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">Submitted</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-[var(--status-warning)] shrink-0" />
            <div>
              <p className="text-[18px] font-bold text-[var(--text-1)] tabular-nums leading-none">{compliance.pending_count}</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-[var(--status-danger)] shrink-0" />
            <div>
              <p className="text-[18px] font-bold text-[var(--text-1)] tabular-nums leading-none">{compliance.overdue_count}</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">Overdue</p>
            </div>
          </div>
        </div>

        {compliance.total_active_partners === 0 && (
          <div className="px-5 py-3 bg-[var(--status-warning-bg)] border-t border-[var(--border-subtle)]">
            <p className="text-[12px] text-[var(--status-warning)]">
              No active partners to track compliance.
            </p>
          </div>
        )}
        {compliance.overdue_count > 0 && (
          <div className="px-5 py-3 bg-[var(--status-danger-bg)] border-t border-[var(--border-subtle)]">
            <p className="text-[12px] text-[var(--status-danger)]">
              {compliance.overdue_count} partner{compliance.overdue_count !== 1 ? "s" : ""} have not submitted today&apos;s report.
            </p>
          </div>
        )}
      </DashboardEntrance>

      {/* ─── Recent Reports ─── */}
      <DashboardEntrance delay={200} className="surface mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Recent Reports</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">Latest submissions from your partners</p>
          </div>
          <Link
            href="/admin/reports"
            className="group flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-150"
          >
            View all
            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="h-8 w-8 text-[var(--text-3)] opacity-30 mx-auto mb-3" />
            <p className="text-[13px] text-[var(--text-3)]">No daily reports yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[#FAFAF8]">
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Partner</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] w-[84px]">Contacted</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] w-[84px]">Appts</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] w-[84px]">Deals</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => {
                  const typed = report as any;
                  const partnerName = typed.partners?.profiles?.full_name || "Unknown";
                  return (
                    <tr key={typed.id} className="border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150 hover:bg-[var(--hover-bg)]">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={partnerName} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[var(--text-1)] truncate">{partnerName}</p>
                            <p
                              className="text-[11px] text-[var(--text-3)] tabular-nums"
                              title={typed.report_date}
                            >
                              {formatReportDate(typed.report_date)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-[13px] tabular-nums text-right font-medium ${typed.leads_contacted > 0 ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}`}>{typed.leads_contacted}</td>
                      <td className={`px-3 py-2.5 text-[13px] tabular-nums text-right font-medium ${typed.appointments_booked > 0 ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}`}>{typed.appointments_booked}</td>
                      <td className="px-3 py-2.5 text-[13px] tabular-nums text-right font-medium">
                        {typed.deals_closed > 0 ? (
                          <span className="text-[var(--status-success)]">{typed.deals_closed}</span>
                        ) : (
                          <span className="text-[var(--text-3)]">{typed.deals_closed}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardEntrance>

      {/* ─── Activity + Announcements ─── */}
      <DashboardEntrance delay={250} className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Activity */}
        <div className="surface">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Recent Activity</h2>
              <p className="text-[12px] text-[var(--text-3)] mt-0.5">What your partners have been up to</p>
            </div>
            <Link
              href="/admin/activity"
              className="group flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-150"
            >
              View all
              <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Clock className="h-8 w-8 text-[var(--text-3)] opacity-30 mx-auto mb-3" />
              <p className="text-[13px] text-[var(--text-3)]">No recent activity.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentActivity.map((activity) => {
                const { icon, color, bg } = getActivityIcon(activity.action);
                return (
                  <div key={activity.id} className="flex items-start gap-3 px-5 py-3">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] mt-[5px] ${bg}`}>
                      <span className={color}>{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text-1)] leading-snug">{formatActionLabel(activity.action)}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-3)] tabular-nums">{getRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="surface self-start">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-1)]">Announcements</h2>
              <p className="text-[12px] text-[var(--text-3)] mt-0.5">Latest from the admin team</p>
            </div>
            <Link
              href="/admin/announcements"
              className="group flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--accent)] transition-colors duration-150"
            >
              View all
              <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {recentAnnouncements.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Megaphone className="h-8 w-8 text-[var(--text-3)] opacity-30 mx-auto mb-3" />
              <p className="text-[13px] text-[var(--text-3)]">No announcements yet.</p>
              <Link
                href="/admin/announcements/new"
                className="mt-3 inline-flex items-center justify-center gap-2 h-[32px] px-3 rounded-[8px] text-[13px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
              >
                Post announcement
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="announcement-card px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    {announcement.is_pinned && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--accent-light)]">
                        <Pin className="h-3 w-3 text-[var(--accent)]" />
                      </div>
                    )}
                    <p className="text-[13px] font-medium text-[var(--text-1)] leading-snug truncate">{announcement.title}</p>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--text-3)] line-clamp-2 leading-relaxed">
                    {announcement.content.replace(/\n/g, " ").substring(0, 120)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-[11px] text-[var(--text-3)] tabular-nums">{getRelativeTime(announcement.created_at)}</p>
                    {announcement.is_pinned && (
                      <span className="text-[10px] font-medium text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded">Pinned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardEntrance>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KPI Card
   ═══════════════════════════════════════════════════════════════ */

function KpiCard({
  icon,
  iconColor,
  iconBg,
  value,
  label,
  context,
  contextColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
  context?: string;
  contextColor?: string;
}) {
  return (
    <div className="kpi-card surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-[24px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[var(--text-1)]">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-[var(--text-3)]">
        {label}
      </p>
      {context && (
        <p className={`mt-0.5 text-[11px] ${contextColor || "text-[var(--text-3)]"}`}>
          {context}
        </p>
      )}
    </div>
  );
}
