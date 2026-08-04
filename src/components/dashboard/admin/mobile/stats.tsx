"use client";

import { Target, Users, ShieldCheck, CalendarCheck } from "lucide-react";
import type { AdminDashboardData } from "@/components/dashboard/helpers";

interface StatsProps {
  counts: AdminDashboardData["counts"];
  compliance: AdminDashboardData["compliance"];
}

export function MobileStats({ counts, compliance }: StatsProps) {
  return (
    <div className="mobile-stat-grid">
      <MobileStatCard
        icon={<Target className="h-5 w-5 text-[var(--accent)]" />}
        iconBg="bg-[var(--accent-light)]"
        value={counts.totalLeads.toLocaleString()}
        label="Total Leads"
        context={`${counts.unassignedLeads} unassigned`}
        contextColor={counts.unassignedLeads > 0 ? "text-[var(--status-warning)]" : undefined}
      />
      <MobileStatCard
        icon={<Users className="h-5 w-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
        value={String(counts.activePartners)}
        label="Active Partners"
        context={`${counts.totalPartners} total`}
      />
      <MobileStatCard
        icon={<ShieldCheck className="h-5 w-5 text-violet-600" />}
        iconBg="bg-violet-50"
        value={`${compliance.compliance_percentage}%`}
        label="Compliance"
        context={`${compliance.submitted_count}/${compliance.total_active_partners} reported`}
        contextColor={
          compliance.overdue_count > 0
            ? "text-[var(--status-danger)]"
            : compliance.pending_count > 0
              ? "text-[var(--status-warning)]"
              : undefined
        }
      />
      <MobileStatCard
        icon={<CalendarCheck className="h-5 w-5 text-amber-600" />}
        iconBg="bg-amber-50"
        value={String(counts.appointmentsToday)}
        label="Appointments"
        context="booked today"
      />
    </div>
  );
}

function MobileStatCard({
  icon,
  iconBg,
  value,
  label,
  context,
  contextColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  context?: string;
  contextColor?: string;
}) {
  return (
    <div className="mobile-stat-card mobile-card-press">
      <div className={`mobile-stat-icon-wrap ${iconBg} flex h-10 w-10 items-center justify-center rounded-[10px]`}>
        {icon}
      </div>
      <p className="text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[var(--text-1)]">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-[var(--text-2)]">
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
