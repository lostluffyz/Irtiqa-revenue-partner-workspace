"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  MessageSquare,
  StickyNote,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { submitDailyReportAction } from "@/app/(dashboard)/partner/actions";
import type { DailyReport } from "@/types/database";

// ============================================
// Date Formatting
// ============================================

function formatHumanDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============================================
// Props
// ============================================

interface DailyReportViewProps {
  report: DailyReport | null;
  date: string;
}

// ============================================
// Metric Card (interactive)
// ============================================

function MetricCard({
  name,
  label,
  icon: Icon,
  description,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  icon: React.ElementType;
  description: string;
  defaultValue?: number;
  disabled?: boolean;
}) {
  return (
    <div
      className={`
        group relative p-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]
        transition-all duration-150
        ${disabled ? "opacity-60" : "hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_var(--accent)]"}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-[8px] bg-[var(--hover-bg)] flex items-center justify-center transition-colors duration-150 group-hover:bg-[var(--accent)]/10">
          <Icon className="h-3.5 w-3.5 text-[var(--text-3)] transition-colors duration-150 group-hover:text-[var(--accent)]" />
        </div>
        <span className="text-[12px] font-semibold text-[var(--text-2)]">
          {label}
        </span>
      </div>
      <input
        type="number"
        name={name}
        min="0"
        defaultValue={defaultValue ?? 0}
        required
        disabled={disabled}
        className="w-full text-center text-[28px] font-bold text-[var(--text-1)] tabular-nums bg-transparent border-none outline-none focus:ring-0 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <p className="text-[11px] text-[var(--text-3)] text-center mt-1">
        {description}
      </p>
    </div>
  );
}

// ============================================
// Submitted Metric Card (read-only)
// ============================================

function SubmittedMetricCard({
  value,
  label,
  icon: Icon,
}: {
  value: number;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <div className="text-center">
      <div className="w-8 h-8 rounded-[8px] bg-[var(--hover-bg)] flex items-center justify-center mx-auto mb-2">
        <Icon className="h-4 w-4 text-[var(--text-3)]" />
      </div>
      <p className="text-[28px] font-bold text-[var(--text-1)] tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] text-[var(--text-3)] mt-1">{label}</p>
    </div>
  );
}

// ============================================
// Read-only Reflection Display
// ============================================

function ReflectionBlock({ title, icon: Icon, content }: { title: string; icon: React.ElementType; content: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-[var(--text-3)]" />
        <p className="text-[12px] font-semibold text-[var(--text-2)]">
          {title}
        </p>
      </div>
      <p className="text-[13px] text-[var(--text-1)] leading-relaxed whitespace-pre-wrap pl-[22px]">
        {content}
      </p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function DailyReportView({ report, date }: DailyReportViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isSubmitted = report || submitted;

  const handleSubmit = useCallback(async (formData: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitDailyReportAction(null, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
        router.refresh();
        setTimeout(() => setSubmitted(false), 2000);
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  }, [router]);

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          Daily Report
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-2)]">
          {formatHumanDate(date)}
        </p>
        <div className="mt-3 h-px bg-[var(--border-subtle)]" />
      </div>

      {/* ─── Status ─── */}
      <div className="mb-6">
        {isSubmitted ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#047857]">
              Submitted
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--hover-bg)] border border-[var(--border)]">
            <FileText className="h-3.5 w-3.5 text-[var(--text-3)]" />
            <span className="text-[12px] font-medium text-[var(--text-2)]">
              Draft — not yet submitted
            </span>
          </div>
        )}
      </div>

      {isSubmitted ? (
        /* ═══ Submitted View ═══ */
        <div className="space-y-8">
          {/* Metrics */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-4">
              Today&apos;s Numbers
            </p>
            <div className="grid grid-cols-3 gap-4">
              <SubmittedMetricCard
                value={report!.leads_contacted}
                label="contacted"
                icon={Send}
              />
              <SubmittedMetricCard
                value={report!.appointments_booked}
                label="appointments"
                icon={CheckCircle2}
              />
              <SubmittedMetricCard
                value={report!.deals_closed}
                label="closed"
                icon={CheckCircle2}
              />
            </div>
          </div>

          {/* Reflections */}
          {(report!.biggest_challenge || report!.additional_notes) && (
            <div className="space-y-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                Reflection
              </p>
              {report!.biggest_challenge && (
                <ReflectionBlock
                  title="Biggest Challenge"
                  icon={MessageSquare}
                  content={report!.biggest_challenge}
                />
              )}
              {report!.additional_notes && (
                <ReflectionBlock
                  title="Additional Notes"
                  icon={StickyNote}
                  content={report!.additional_notes}
                />
              )}
            </div>
          )}

          {/* Submission time */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] text-[var(--text-3)] tabular-nums">
              Submitted at {formatShortTime(report!.created_at)}
            </p>
          </div>
        </div>
      ) : (
        /* ═══ Draft View ═══ */
        <form action={handleSubmit} className="space-y-8">
          {error && <FormError message={error} />}

          {/* ─── Daily Metrics ─── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-4">
              Daily Metrics
            </p>
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                name="leadsContacted"
                label="Leads Contacted"
                icon={Send}
                description="calls, emails, outreach"
                disabled={loading}
              />
              <MetricCard
                name="appointmentsBooked"
                label="Appointments"
                icon={CheckCircle2}
                description="meetings scheduled"
                disabled={loading}
              />
              <MetricCard
                name="dealsClosed"
                label="Deals Closed"
                icon={CheckCircle2}
                description="partnerships finalized"
                disabled={loading}
              />
            </div>
          </div>

          {/* ─── Reflection ─── */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
              Reflection
            </p>

            {/* Biggest Challenge */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-[var(--text-3)]" />
                <label
                  htmlFor="biggestChallenge"
                  className="text-[12px] font-semibold text-[var(--text-2)]"
                >
                  Biggest Challenge
                </label>
              </div>
              <input
                type="text"
                id="biggestChallenge"
                name="biggestChallenge"
                defaultValue=""
                placeholder="What slowed you down today?"
                disabled={loading}
                className="w-full px-3 py-2 text-[13px] bg-[var(--canvas)] border border-[var(--border)] rounded-[8px] text-[var(--text-1)] placeholder:text-[var(--text-3)] placeholder:italic transition-all duration-150 hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <StickyNote className="h-3.5 w-3.5 text-[var(--text-3)]" />
                <label
                  htmlFor="additionalNotes"
                  className="text-[12px] font-semibold text-[var(--text-2)]"
                >
                  Additional Notes
                </label>
              </div>
              <textarea
                id="additionalNotes"
                name="additionalNotes"
                rows={4}
                defaultValue=""
                placeholder="Wins, learnings, anything worth remembering..."
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] leading-relaxed min-h-[100px] bg-[var(--canvas)] border border-[var(--border)] rounded-[8px] text-[var(--text-1)] placeholder:text-[var(--text-3)] placeholder:italic resize-none transition-all duration-150 hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* ─── Submit ─── */}
          <div className="pt-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] text-[var(--text-3)]">
                Reports lock after submission and cannot be edited.
              </p>
              {submitted ? (
                <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--status-success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submitted
                </div>
              ) : (
                <Button
                  type="submit"
                  loading={loading}
                  size="md"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Report
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
