"use client";

import { ShieldCheck } from "lucide-react";
import type { AdminDashboardData } from "@/components/dashboard/helpers";

interface ComplianceProps {
  compliance: AdminDashboardData["compliance"];
}

export function MobileCompliance({ compliance }: ComplianceProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent-light)]">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Daily Compliance</h2>
            <p className="text-[13px] text-[var(--text-3)] mt-0.5">
              Deadline: {compliance.deadline_display} UTC
              {compliance.grace_period_minutes > 0 && (
                <span> ({compliance.grace_period_minutes} min grace)</span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right mt-3">
          <p className="text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
            {compliance.compliance_percentage}%
          </p>
          <p className="text-[12px] text-[var(--text-3)] mt-1.5">
            {compliance.submitted_count}/{compliance.total_active_partners} partners
          </p>
        </div>
      </div>

      <div className="mobile-section-body">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)] mb-4"
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
        <div className="mobile-compliance-row">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[var(--status-success)] shrink-0" />
            <div>
              <p className="text-[18px] font-bold text-[var(--text-1)] tabular-nums leading-none">{compliance.submitted_count}</p>
              <p className="text-[12px] text-[var(--text-3)] mt-1">Submitted</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[var(--status-warning)] shrink-0" />
            <div>
              <p className="text-[18px] font-bold text-[var(--text-1)] tabular-nums leading-none">{compliance.pending_count}</p>
              <p className="text-[12px] text-[var(--text-3)] mt-1">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[var(--status-danger)] shrink-0" />
            <div>
              <p className="text-[18px] font-bold text-[var(--text-1)] tabular-nums leading-none">{compliance.overdue_count}</p>
              <p className="text-[12px] text-[var(--text-3)] mt-1">Overdue</p>
            </div>
          </div>
        </div>

        {compliance.total_active_partners === 0 && (
          <div className="mobile-compliance-banner mobile-compliance-banner-warning">
            <p className="text-[13px] text-[var(--status-warning)]">No active partners to track compliance.</p>
          </div>
        )}
        {compliance.overdue_count > 0 && (
          <div className="mobile-compliance-banner mobile-compliance-banner-danger">
            <p className="text-[13px] text-[var(--status-danger)]">
              {compliance.overdue_count} partner{compliance.overdue_count !== 1 ? "s" : ""} have not submitted today&apos;s report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
