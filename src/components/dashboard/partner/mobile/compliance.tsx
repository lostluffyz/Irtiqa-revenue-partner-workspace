"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { formatDeadlineTime, formatDeadlineInTimezone, PROGRAM_TIMEZONE } from "@/components/dashboard/helpers";

interface ComplianceProps {
  status: "submitted" | "pending" | "overdue";
  deadlineHour?: number;
  deadlineMinute?: number;
  overdueDuration?: string;
  todayReport?: {
    leads_contacted: number;
    appointments_booked: number;
    deals_closed: number;
  } | null;
}

export function MobileCompliance({ status, deadlineHour, deadlineMinute, overdueDuration, todayReport }: ComplianceProps) {
  if (status === "submitted") {
    return (
      <div className="mobile-compliance-row mobile-compliance-banner">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--status-success-bg)] shrink-0">
          <ClipboardCheck className="h-6 w-6 text-[var(--status-success)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[var(--text-1)]">Report Submitted</p>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            {todayReport?.leads_contacted} contacted, {todayReport?.appointments_booked} appointments, {todayReport?.deals_closed} deals
          </p>
        </div>
        <Link href="/partner/report" className="shrink-0 mt-3 md:mt-0">
          <Button variant="secondary" size="sm" className="min-h-[48px] px-5">View Report</Button>
        </Link>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mobile-compliance-row mobile-compliance-banner">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--status-warning-bg)] shrink-0">
          <AlertTriangle className="h-6 w-6 text-[var(--status-warning)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[var(--text-1)]">Daily Report Required</p>
          <div className="mt-1 text-[13px]">
            <p className="text-[var(--text-3)]">Submit before</p>
            {deadlineHour !== undefined && deadlineMinute !== undefined && (
              <>
                <p className="text-[var(--text-1)] font-medium tabular-nums">
                  {formatDeadlineTime(deadlineHour, deadlineMinute)} UTC
                </p>
                <p className="text-[var(--text-3)]">
                  ({formatDeadlineInTimezone(deadlineHour, deadlineMinute, PROGRAM_TIMEZONE)} local)
                </p>
              </>
            )}
          </div>
        </div>
        <Link href="/partner/report" className="shrink-0 mt-3 md:mt-0">
          <Button variant="primary" size="sm" className="min-h-[48px] px-5">
            Submit Report
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  // overdue
  return (
    <div className="mobile-compliance-row mobile-compliance-banner">
      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--status-danger-bg)] shrink-0">
        <Clock className="h-6 w-6 text-[var(--status-danger)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[var(--text-1)]">Today&apos;s report is overdue</p>
        <p className="mt-1 text-[13px] text-[var(--status-danger)]">
          {overdueDuration ? `Overdue by ${overdueDuration}` : "Please submit immediately"}
        </p>
      </div>
      <Link href="/partner/report" className="shrink-0 mt-3 md:mt-0">
        <Button variant="primary" size="sm" className="min-h-[48px] px-5 bg-[var(--status-danger)] hover:bg-[var(--status-danger)]/90">
          Submit Report Now
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
