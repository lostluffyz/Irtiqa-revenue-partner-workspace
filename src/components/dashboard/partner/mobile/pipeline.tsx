"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { PIPELINE_COLORS, PIPELINE_LABELS, PIPELINE_STATUSES } from "@/components/dashboard/helpers";

interface PipelineProps {
  totalLeads: number;
  totalLeadsContacted: number;
  totalAppointments: number;
  totalDeals: number;
}

export function MobilePipeline({ totalLeads, totalLeadsContacted, totalAppointments, totalDeals }: PipelineProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)] mb-1.5">
            Lead Pipeline
          </p>
          <p className="text-[14px] text-[var(--text-2)]">
            {totalLeads} total leads
          </p>
        </div>
        <Link href="/partner/leads" className="mobile-section-link">
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {totalLeads === 0 ? (
        <div className="mobile-section-body py-10 text-center">
          <Target className="h-8 w-8 mx-auto text-[var(--text-3)] opacity-40 mb-3" />
          <p className="text-[14px] text-[var(--text-3)]">No leads assigned yet</p>
        </div>
      ) : (
        <div className="mobile-section-body">
          {PIPELINE_STATUSES.map((status) => {
            const count = status === "not_contacted"
              ? Math.max(0, totalLeads - totalLeadsContacted)
              : status === "contacted"
                ? Math.max(0, totalLeadsContacted - totalAppointments)
                : status === "appointment_booked"
                  ? totalAppointments
                  : status === "closed"
                    ? totalDeals
                    : 0;
            const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
            return (
              <div key={status} className="mobile-pipeline-row">
                <div className="mobile-pipeline-label">
                  <span className="mobile-pipeline-dot" style={{ backgroundColor: PIPELINE_COLORS[status] }} />
                  {PIPELINE_LABELS[status]}
                </div>
                <div className="mobile-pipeline-bar">
                  <div
                    className="mobile-pipeline-fill"
                    style={{ width: `${pct}%`, backgroundColor: PIPELINE_COLORS[status] }}
                  />
                </div>
                <span className="mobile-pipeline-value">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
