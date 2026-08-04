"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { ReportWithType } from "@/components/dashboard/helpers";

interface ReportsProps {
  reports: ReportWithType[];
}

export function MobileReports({ reports }: ReportsProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div>
          <h2 className="mobile-section-title">Recent Reports</h2>
          <p className="text-[13px] text-[var(--text-3)] mt-0.5">Latest submissions</p>
        </div>
        <Link
          href="/admin/reports"
          className="mobile-section-link"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="mobile-empty">
          <FileText className="mobile-empty-icon" />
          <p className="mobile-empty-text">No daily reports yet.</p>
        </div>
      ) : (
        <div className="mobile-section-body">
          {reports.map((report) => {
            const typed = report as any;
            const partnerName = typed.partners?.profiles?.full_name || "Unknown";
            return (
              <div key={typed.id} className="mobile-report-item">
                <Avatar name={partnerName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text-1)] truncate">{partnerName}</p>
                  <p className="text-[12px] text-[var(--text-3)] mt-0.5">{typed.report_date}</p>
                </div>
                <div className="mobile-report-stats">
                  <span className="mobile-report-stat">
                    <span className="text-[12px] text-[var(--text-3)]">C</span>
                    <span className="tabular-nums font-medium">{typed.leads_contacted}</span>
                  </span>
                  <span className="mobile-report-stat">
                    <span className="text-[12px] text-[var(--text-3)]">A</span>
                    <span className="tabular-nums font-medium">{typed.appointments_booked}</span>
                  </span>
                  <span className="mobile-report-stat">
                    <span className="text-[12px] text-[var(--text-3)]">D</span>
                    <span className={`tabular-nums font-medium ${typed.deals_closed > 0 ? "text-[var(--status-success)]" : ""}`}>
                      {typed.deals_closed}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
