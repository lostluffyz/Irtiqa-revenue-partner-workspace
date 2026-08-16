"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Pause,
  Key,
  Check,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  Trophy,
  Flame,
  Clock,
  AlertTriangle,
  Activity,
  Globe,
  Trash2,
  Target,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ReportStatusChip,
  LiveClockCompact,
} from "@/components/ui";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import {
  resetPasswordAction,
  updatePartnerStatusAction,
} from "../actions";
import { DeletePartnerDialog } from "../delete-partner-dialog";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface PartnerDetailProps {
  partner: {
    id: string;
    company_id: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
    phone: string | null;
    program_start_date: string;
    profiles: { full_name: string; email: string } | null;
    regions: { id: string; name: string } | null;
  };
  leads: Array<{
    id: string;
    company_name: string;
    email: string | null;
    status: string;
    assigned_at: string | null;
  }>;
  reports: Array<{
    id: string;
    report_date: string;
    leads_contacted: number;
    appointments_booked: number;
    deals_closed: number;
    biggest_challenge: string | null;
  }>;
  activity: Array<{
    id: string;
    action: string;
    details: Record<string, unknown> | null;
    created_at: string;
  }>;
  stats: {
    leadCount: number;
    reportCount: number;
    totalAppointments: number;
    totalDeals: number;
  };
  compliance: {
    status: "submitted" | "pending" | "overdue";
    deadlineDisplay: string;
    isOverdue: boolean;
    overdueDuration: string | null;
    reportsThisMonth: number;
    totalDaysInMonth: number;
    // Dual timezone display data
    deadlineUTC: string;
    deadlineLocal: string;
    deadlineUTCTimezone: string;
    deadlineLocalTimezone: string;
    partnerTimezone: string;
    partnerTimezoneOffset: string;
    partnerTimezoneLabel: string;
  };
  programDay: number;
  streak: number;
  allocationState: {
    programDay: number;
    programExpired: boolean;
    totalAssigned: number;
    effectiveProgramLimit: number;
    approvedExtraLeads: number;
    programCapacity: number;
    weeklyLimit: number;
    weeklyUsed: number;
    weeklyCapacity: number;
    periodStart: string;
    periodEnd: string;
    allocationEnabled: boolean;
    eligible: boolean;
    eligibleReason: string;
  } | null;
  allocationBatches: Array<{
    id: string;
    lead_count: number;
    program_total_after: number;
    source: string;
    reason: string | null;
    created_at: string;
  }>;
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<
  string,
  { variant: "success" | "warning" | "danger" | "default"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "warning", label: "Inactive" },
  suspended: { variant: "danger", label: "Suspended" },
};

const LEAD_STATUS_CONFIG: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  not_contacted: { variant: "default", label: "Not Contacted" },
  contacted: { variant: "info", label: "Contacted" },
  follow_up_required: { variant: "warning", label: "Follow Up" },
  appointment_booked: { variant: "success", label: "Appointment" },
  closed: { variant: "success", label: "Closed" },
  not_interested: { variant: "danger", label: "Not Interested" },
  invalid_contact: { variant: "danger", label: "Invalid" },
};

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
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

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityDotColor(action: string): string {
  if (action.includes("partner")) return "bg-[var(--accent)]";
  if (action.includes("lead")) return "bg-purple-500";
  if (action.includes("report")) return "bg-[var(--status-success)]";
  return "bg-[var(--text-3)]";
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function PartnerDetail({
  partner,
  leads,
  reports,
  activity,
  stats,
  compliance,
  programDay,
  streak,
  allocationState,
  allocationBatches,
}: PartnerDetailProps) {
  const router = useRouter();
  const displayName = partner.profiles?.full_name || partner.company_id;
  const statusConfig =
    STATUS_CONFIG[partner.status] || STATUS_CONFIG.active;
  const compliancePct =
    compliance.totalDaysInMonth > 0
      ? Math.round(
          (compliance.reportsThisMonth / compliance.totalDaysInMonth) * 100,
        )
      : 0;

  // Password reset state
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const resetPwdRef = useRef<HTMLDivElement>(null);

  // Status change state
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete partner state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Close password reset on outside click
  useEffect(() => {
    if (!resetPwdOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        resetPwdRef.current &&
        !resetPwdRef.current.contains(e.target as Node)
      ) {
        setResetPwdOpen(false);
        setResetPwdResult(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [resetPwdOpen]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true);
    try {
      const formData = new FormData();
      formData.set("partnerId", partner.id);
      formData.set("status", newStatus);
      await updatePartnerStatusAction(null, formData);
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetPwdLoading(true);
    const formData = new FormData(e.currentTarget);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await resetPasswordAction(null, formData);
    if (result?.newPassword) {
      setResetPwdResult(result.newPassword);
    }
    setResetPwdLoading(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* ═══════════════════════════════════════════════════════════
          BACK LINK
          ═══════════════════════════════════════════════════════════ */}
      <Link
        href="/admin/partners"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Partners
      </Link>

      {/* ═══════════════════════════════════════════════════════════
          PROFILE HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar + Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar name={displayName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
                  {displayName}
                </h1>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <code
                  className="dl-type-micro normal-case tracking-normal text-[var(--text-2)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {partner.company_id}
                </code>
                {partner.profiles?.email && (
                  <>
                    <span className="dl-type-micro text-[var(--text-3)]">·</span>
                    <span className="dl-type-caption text-[var(--text-3)] truncate max-w-[240px]">
                      {partner.profiles.email}
                    </span>
                  </>
                )}
                {partner.regions && (
                  <>
                    <span className="dl-type-micro text-[var(--text-3)]">·</span>
                    <span className="dl-type-caption text-[var(--text-3)]">
                      {partner.regions.name}
                    </span>
                  </>
                )}
              </div>
              <p className="dl-type-caption text-[var(--text-3)] mt-1.5">
                Created{" "}
                {new Date(partner.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>

              {/* Timezone Section */}
              <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--canvas-secondary)] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Globe className="h-3 w-3 text-[var(--text-3)]" />
                  <p className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-wider">
                    Timezone
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
                  <div>
                    <span className="text-[var(--text-3)]">Region</span>
                    <p className="text-[var(--text-1)] font-medium">
                      {compliance.partnerTimezone} (UTC{compliance.partnerTimezoneOffset})
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Current UTC</span>
                    <p className="text-[var(--text-1)] font-medium tabular-nums">
                      <LiveClockCompact timezone="UTC" /> UTC
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Current Local</span>
                    <p className="text-[var(--text-1)] font-medium tabular-nums">
                      <LiveClockCompact timezone={compliance.partnerTimezone} /> {compliance.partnerTimezoneLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Toggle */}
            {partner.status === "active" ? (
              <div className="relative" ref={resetPwdRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    handleStatusChange(
                      partner.status === "active" ? "suspended" : "active",
                    )
                  }
                  loading={statusLoading}
                >
                  <Pause className="h-3.5 w-3.5" />
                  Suspend
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange("active")}
                loading={statusLoading}
              >
                <Shield className="h-3.5 w-3.5" />
                Activate
              </Button>
            )}

            {/* Reset Password */}
            <div className="relative" ref={resetPwdRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setResetPwdOpen(!resetPwdOpen);
                  setResetPwdResult(null);
                }}
              >
                <Key className="h-3.5 w-3.5" />
                Reset Password
              </Button>

              {resetPwdOpen && (
                <div className="absolute right-0 top-full mt-2 w-[280px] dl-surface dl-elevate-3 z-50 rounded-[var(--radius-md)] overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
                    <p className="dl-type-body font-medium text-[var(--text-1)]">
                      Reset Password
                    </p>
                    <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
                      {displayName}
                    </p>
                  </div>
                  <div className="p-3">
                    {resetPwdResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] bg-[var(--status-success-bg)] border border-emerald-200">
                          <Check className="h-3.5 w-3.5 text-[var(--status-success)] shrink-0" />
                          <p className="dl-type-body font-medium text-emerald-800">
                            Password updated
                          </p>
                        </div>
                        <p
                          className="dl-type-body bg-[var(--canvas)] px-2.5 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] break-all"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {resetPwdResult}
                        </p>
                        <button
                          onClick={() => {
                            setResetPwdOpen(false);
                            setResetPwdResult(null);
                          }}
                          className="w-full h-[32px] rounded-[var(--radius-sm)] bg-[var(--canvas)] border border-[var(--border-subtle)] dl-type-body font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border)] transition-colors duration-100"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-2">
                        <input
                          type="hidden"
                          name="partnerId"
                          value={partner.id}
                        />
                        <div>
                          <label className="dl-type-micro mb-1 block">
                            New Password
                          </label>
                          <input
                            type="password"
                            name="newPassword"
                            placeholder="Minimum 8 characters"
                            className="input-field text-[13px] h-[32px]"
                            required
                            minLength={8}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            disabled={resetPwdLoading}
                            className="flex-1 h-[32px] rounded-[var(--radius-sm)] bg-[var(--accent)] text-white dl-type-body font-medium hover:bg-[var(--accent-hover)] transition-colors duration-100 disabled:opacity-50"
                          >
                            {resetPwdLoading ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetPwdOpen(false);
                              setResetPwdResult(null);
                            }}
                            className="px-3 h-[32px] rounded-[var(--radius-sm)] bg-[var(--canvas)] border border-[var(--border-subtle)] dl-type-body font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border)] transition-colors duration-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          STATS CARDS
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            icon: Users,
            value: stats.leadCount,
            label: "Assigned Leads",
          },
          {
            icon: FileText,
            value: stats.reportCount,
            label: "Total Reports",
          },
          {
            icon: BarChart3,
            value: `${compliancePct}%`,
            label: "Compliance",
          },
          {
            icon: Calendar,
            value: `${Math.max(0, programDay)}/30`,
            label: "Program Day",
          },
          {
            icon: TrendingUp,
            value: stats.totalAppointments,
            label: "Appointments",
          },
          {
            icon: Trophy,
            value: stats.totalDeals,
            label: "Deals Closed",
          },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="dl-surface p-4 flex flex-col items-center text-center"
          >
            <Icon className="h-4 w-4 text-[var(--text-3)] mb-2" />
            <p className="dl-type-title dl-tabular text-[var(--text-1)]">
              {value}
            </p>
            <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)] mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DAILY COMPLIANCE CARD
          ═══════════════════════════════════════════════════════════ */}
      <div
        className={`surface p-5 sm:p-6 border-l-4 ${
          compliance.status === "submitted"
            ? "border-l-[var(--status-success)]"
            : compliance.status === "overdue"
              ? "border-l-[var(--status-danger)]"
              : "border-l-[var(--status-warning)]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: Status */}
          <div className="flex items-center gap-3 flex-1">
            {compliance.status === "submitted" ? (
              <Check className="h-5 w-5 text-[var(--status-success)]" />
            ) : compliance.status === "overdue" ? (
              <AlertTriangle className="h-5 w-5 text-[var(--status-danger)]" />
            ) : (
              <Clock className="h-5 w-5 text-[var(--status-warning)]" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="dl-type-body font-semibold text-[var(--text-1)]">
                  Today&apos;s Report
                </p>
                <ReportStatusChip status={compliance.status} />
              </div>
              <p className="dl-type-caption text-[var(--text-3)] mt-0.5">
                Deadline: {compliance.deadlineDisplay}
                {compliance.overdueDuration && (
                  <span className="text-[var(--status-danger)]">
                    {" "}
                    · Overdue by {compliance.overdueDuration}
                  </span>
                )}
              </p>

              {/* Structured Deadline Display */}
              <div className="mt-2 rounded-md bg-[var(--canvas-secondary)] p-2.5 border border-[var(--border-subtle)]">
                <div className="grid grid-cols-2 gap-x-6 text-[12px]">
                  <div>
                    <span className="text-[var(--text-3)]">UTC</span>
                    <p className="text-[var(--text-1)] font-medium tabular-nums">
                      {compliance.deadlineUTC} UTC
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Partner Local</span>
                    <p className="text-[var(--text-1)] font-medium tabular-nums">
                      {compliance.deadlineLocal} {compliance.deadlineLocalTimezone}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Monthly stats */}
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                {compliance.reportsThisMonth}/{compliance.totalDaysInMonth}
              </p>
              <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
                This Month
              </p>
            </div>
            <div className="text-center">
              <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                {compliancePct}%
              </p>
              <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
                Compliance
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-[var(--status-warning)]" />
                <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                  {streak}
                </p>
              </div>
              <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
                Streak
              </p>
            </div>
          </div>
        </div>

        {/* Overdue Warning */}
        {compliance.isOverdue && compliance.status === "overdue" && (
          <div className="mt-4 flex items-start gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--status-danger-bg)] border border-[var(--status-danger)]/20">
            <AlertTriangle className="h-4 w-4 text-[var(--status-danger)] shrink-0 mt-0.5" />
            <div>
              <p className="dl-type-body font-medium text-[var(--status-danger)]">
                Report is overdue
              </p>
              <p className="dl-type-caption text-red-600 mt-0.5">
                {displayName} has not submitted today&apos;s report. It was due
                at {compliance.deadlineUTC} UTC ({compliance.deadlineLocal} {compliance.deadlineLocalTimezone}).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ALLOCATION STATUS CARD
          ═══════════════════════════════════════════════════════════ */}
      {allocationState && (
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-[var(--text-3)]" />
            <h2 className="dl-type-body font-semibold text-[var(--text-1)]">
              Lead Allocation
            </h2>
            {!allocationState.allocationEnabled && (
              <Badge variant="info" className="text-xs">Disabled</Badge>
            )}
            {allocationState.programExpired && (
              <Badge variant="danger" className="text-xs">Expired</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="dl-type-caption text-[var(--text-3)]">Program Limit</p>
              <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                {allocationState.effectiveProgramLimit}
                {allocationState.approvedExtraLeads > 0 && (
                  <span className="text-emerald-600 text-xs ml-1">(+{allocationState.approvedExtraLeads} extra)</span>
                )}
              </p>
            </div>
            <div>
              <p className="dl-type-caption text-[var(--text-3)]">Assigned / Remaining</p>
              <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                {allocationState.totalAssigned} / {allocationState.programCapacity}
              </p>
              <div className="mt-1 h-1.5 w-full bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (allocationState.totalAssigned / allocationState.effectiveProgramLimit) * 100)}%`,
                    backgroundColor:
                      allocationState.programCapacity <= 0
                        ? "var(--status-danger)"
                        : allocationState.programCapacity < 50
                          ? "var(--status-warning)"
                          : "var(--accent)",
                  }}
                />
              </div>
            </div>
            <div>
              <p className="dl-type-caption text-[var(--text-3)]">Weekly Limit</p>
              <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                {allocationState.weeklyUsed} / {allocationState.weeklyLimit}
              </p>
              <div className="mt-1 h-1.5 w-full bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (allocationState.weeklyUsed / allocationState.weeklyLimit) * 100)}%`,
                    backgroundColor:
                      allocationState.weeklyCapacity <= 0
                        ? "var(--status-danger)"
                        : allocationState.weeklyCapacity < 20
                          ? "var(--status-warning)"
                          : "var(--accent)",
                  }}
                />
              </div>
            </div>
            <div>
              <p className="dl-type-caption text-[var(--text-3)]">Period</p>
              <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
                {new Date(allocationState.periodStart + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}
                {new Date(allocationState.periodEnd + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Recent allocation batches */}
          {allocationBatches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <p className="dl-type-caption text-[var(--text-3)] mb-2">Recent Batches</p>
              <div className="space-y-1.5">
                {allocationBatches.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={batch.source === "automatic" ? "default" : "info"} className="text-[10px]">
                        {batch.source}
                      </Badge>
                      <span className="text-[var(--text-2)]">
                        {batch.lead_count} leads → total {batch.program_total_after}
                      </span>
                    </div>
                    <span className="text-[var(--text-3)]">
                      {new Date(batch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          RECENT DAILY REPORTS
          ═══════════════════════════════════════════════════════════ */}
      <div className="surface">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--text-3)]" />
            <h2 className="dl-type-body font-semibold text-[var(--text-1)]">
              Recent Daily Reports
            </h2>
            {reports.length > 0 && (
              <Badge variant="default">{reports.length}</Badge>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No daily reports"
              description="This partner has not submitted any daily reports yet."
            />
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Appointments
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Leads Contacted
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Deals Closed
                </TableHeaderCell>
                <TableHeaderCell>Challenge</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.slice(0, 14).map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-[var(--text-1)] tabular-nums">
                    {report.report_date}
                  </TableCell>
                  <TableCell>
                    <ReportStatusChip status="submitted" />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {report.appointments_booked}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {report.leads_contacted}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {report.deals_closed}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-[12px] text-[var(--text-3)]">
                    {report.biggest_challenge || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ASSIGNED LEADS
          ═══════════════════════════════════════════════════════════ */}
      <div className="surface">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-3)]" />
            <h2 className="dl-type-body font-semibold text-[var(--text-1)]">
              Assigned Leads
            </h2>
            {leads.length > 0 && (
              <Badge variant="default">{leads.length}</Badge>
            )}
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No leads assigned"
              description="This partner has not been assigned any leads yet."
            />
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Lead Name</TableHeaderCell>
                <TableHeaderCell>Company</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Assigned</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.slice(0, 20).map((lead) => {
                const leadStatus =
                  LEAD_STATUS_CONFIG[lead.status] ||
                  LEAD_STATUS_CONFIG.not_contacted;
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-[var(--text-1)]">
                      {lead.email || "—"}
                    </TableCell>
                    <TableCell className="text-[var(--text-2)]">
                      {lead.company_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={leadStatus.variant}>
                        {leadStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="dl-type-caption text-[var(--text-3)] tabular-nums">
                      {formatRelativeDate(lead.assigned_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RECENT ACTIVITY
          ═══════════════════════════════════════════════════════════ */}
      <div className="surface">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--text-3)]" />
            <h2 className="dl-type-body font-semibold text-[var(--text-1)]">
              Recent Activity
            </h2>
          </div>
        </div>

        {activity.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No activity recorded"
              description="Activity entries will appear here as this partner uses the workspace."
            />
          </div>
        ) : (
          <div className="p-5">
            <div className="relative pl-7">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[var(--border)]" />

              {activity.map((entry) => (
                <div
                  key={entry.id}
                  className="relative flex items-start gap-4 py-3"
                >
                  {/* Dot */}
                  <div
                    className={`absolute -left-7 top-[13px] h-[7px] w-[7px] rounded-full border-[2.5px] border-[var(--surface)] ${getActivityDotColor(entry.action)}`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="dl-type-body text-[var(--text-1)] leading-snug">
                      {formatAction(entry.action)}
                    </p>

                    {entry.details && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {typeof entry.details === "object" &&
                          !Array.isArray(entry.details) &&
                          Object.entries(entry.details)
                            .filter(
                              ([key]) =>
                                !key.toLowerCase().includes("passw") &&
                                !key.toLowerCase().includes("secret"),
                            )
                            .map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-block rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[var(--text-2)]"
                              >
                                <span className="text-[var(--text-3)]">
                                  {key}:
                                </span>{" "}
                                {String(value).substring(0, 50)}
                              </span>
                            ))}
                      </div>
                    )}
                  </div>

                  <span className="shrink-0 dl-type-caption text-[var(--text-3)] tabular-nums">
                    {formatTimestamp(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DANGER ZONE
          ═══════════════════════════════════════════════════════════ */}
      <div className="surface border border-red-200 bg-red-50/30">
        <div className="px-5 py-4 border-b border-red-200">
          <h2 className="dl-type-body font-semibold text-red-800">
            Danger Zone
          </h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="dl-type-body font-medium text-[var(--text-1)]">
              Delete Partner
            </p>
            <p className="dl-type-caption text-[var(--text-3)] mt-0.5">
              Permanently remove this revenue partner and all associated data.
              This action cannot be undone.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Partner
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeletePartnerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        partnerId={partner.id}
        partnerName={displayName}
        companyId={partner.company_id}
        email={partner.profiles?.email || ""}
        region={partner.regions?.name || "—"}
        status={partner.status}
      />
    </div>
  );
}
