"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  MessageSquare,
  StickyNote,
  Send,
  CalendarCheck,
  Trophy,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { PageHeader } from "@/components/ui/page-header";
import { formatDeadlineTime } from "@/components/dashboard/helpers";
import { DueLine } from "@/components/dashboard/use-viewer-deadline";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { submitDailyReportAction } from "@/app/(dashboard)/partner/actions";
import type { DailyReport } from "@/types/database";

// ============================================
// Date Formatting (manual parse — timezone-safe)
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
  deadlineHour?: number;
  deadlineMinute?: number;
}

// ============================================
// Metric Stepper (interactive)
// Values flow into the SAME hidden-visible field names as before.
// ============================================

function MetricStepper({
  name,
  label,
  caption,
  icon: Icon,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  caption: string;
  icon: React.ElementType;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const clamp = (n: number) => (Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n)));

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--hover-bg)] text-[var(--text-2)]">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--text-1)]">{label}</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-2)]">{caption}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled}
          aria-label={`Decrease ${label}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[18px] font-medium text-[var(--text-2)] transition-colors duration-150 hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          name={name}
          inputMode="numeric"
          min="0"
          required
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
          disabled={disabled}
          aria-label={label}
          className="w-20 min-h-[44px] text-center text-[22px] font-bold text-[var(--text-1)] tabular-nums bg-transparent border border-[var(--border)] rounded-[10px] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          aria-label={`Increase ${label}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[18px] font-medium text-[var(--text-2)] transition-colors duration-150 hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
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

export function DailyReportView({ report, date, deadlineHour, deadlineMinute }: DailyReportViewProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Metric values — same numbers the form submits via the SAME field names.
  const [leadsContacted, setLeadsContacted] = useState(0);
  const [appointmentsBooked, setAppointmentsBooked] = useState(0);
  const [dealsClosed, setDealsClosed] = useState(0);

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

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    submitBtnRef.current?.focus();
  }, []);

  // Open the confirm dialog only when the form's own built-in
  // validation (required, min) already passes — same rules as before.
  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setConfirmOpen(true);
  }, []);

  const confirmSubmit = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    setConfirmOpen(false);
    handleSubmit(new FormData(form));
  }, [handleSubmit]);

  const allZero = leadsContacted === 0 && appointmentsBooked === 0 && dealsClosed === 0;

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6">
        <PageHeader
          title="Daily Report"
          description={formatHumanDate(date)}
          action={
            isSubmitted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success)]/25 bg-[var(--status-success-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--status-success)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-2)]">
                <FileText className="h-3.5 w-3.5 text-[var(--text-3)]" />
                Not submitted yet
              </span>
            )
          }
        />
        {!isSubmitted && deadlineHour !== undefined && deadlineMinute !== undefined && (
          <p className="mt-2 text-[13px] text-[var(--text-3)] tabular-nums">
            Due {formatDeadlineTime(deadlineHour, deadlineMinute)} UTC ·{" "}
            <DueLine utcHour={deadlineHour} utcMinute={deadlineMinute} />
          </p>
        )}
        <div className="mt-4 h-px bg-[var(--border-subtle)]" />
      </div>

      {isSubmitted ? (
        /* ═══ Submitted View (locked, read-only) ═══ */
        <div className="space-y-6">
          {/* Metrics */}
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
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
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] space-y-5">
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
          <div className="pt-2">
            <p className="text-[11px] text-[var(--text-3)] tabular-nums">
              Submitted at {formatShortTime(report!.created_at)}
            </p>
          </div>
        </div>
      ) : (
        /* ═══ Form View ═══ */
        <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
          {error && <FormError message={error} />}

          {/* ─── Daily Metrics ─── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-3">
              Daily Metrics
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricStepper
                name="leadsContacted"
                label="Leads Contacted"
                caption="Calls, emails and outreach today"
                icon={Send}
                value={leadsContacted}
                onChange={setLeadsContacted}
                disabled={loading}
              />
              <MetricStepper
                name="appointmentsBooked"
                label="Appointments"
                caption="Meetings scheduled today"
                icon={CalendarCheck}
                value={appointmentsBooked}
                onChange={setAppointmentsBooked}
                disabled={loading}
              />
              <MetricStepper
                name="dealsClosed"
                label="Deals Closed"
                caption="Partnerships finalized today"
                icon={Trophy}
                value={dealsClosed}
                onChange={setDealsClosed}
                disabled={loading}
              />
            </div>
          </div>

          {/* ─── Reflection ─── */}
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] space-y-4">
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
                  Biggest Challenge <span className="font-normal text-[var(--text-3)]">(optional)</span>
                </label>
              </div>
              <input
                type="text"
                id="biggestChallenge"
                name="biggestChallenge"
                defaultValue=""
                placeholder="What slowed you down today?"
                disabled={loading}
                className="w-full min-h-[44px] px-3 py-2 text-[13px] bg-[var(--surface)] border border-[var(--border)] rounded-[12px] text-[var(--text-1)] placeholder:text-[var(--text-3)] transition-all duration-150 hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-[var(--text-3)]">Up to 2000 characters.</p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <StickyNote className="h-3.5 w-3.5 text-[var(--text-3)]" />
                <label
                  htmlFor="additionalNotes"
                  className="text-[12px] font-semibold text-[var(--text-2)]"
                >
                  Additional Notes <span className="font-normal text-[var(--text-3)]">(optional)</span>
                </label>
              </div>
              <textarea
                id="additionalNotes"
                name="additionalNotes"
                rows={4}
                defaultValue=""
                placeholder="Wins, learnings, anything worth remembering..."
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] leading-relaxed min-h-[100px] bg-[var(--surface)] border border-[var(--border)] rounded-[12px] text-[var(--text-1)] placeholder:text-[var(--text-3)] resize-none transition-all duration-150 hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-[var(--text-3)]">Up to 5000 characters.</p>
            </div>
          </div>

          {/* ─── Submit ─── */}
          <div className="pt-2">
            <p className="mb-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--text-2)]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-3)]" />
              Reports lock after submission and cannot be edited.
            </p>
            <div className="flex md:justify-end">
              {submitted ? (
                <div className="inline-flex w-full items-center justify-center gap-1.5 text-[12px] font-medium text-[var(--status-success)] md:w-auto">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submitted
                </div>
              ) : (
                <Button
                  ref={submitBtnRef}
                  type="submit"
                  loading={loading}
                  size="md"
                  className="min-h-[48px] w-full rounded-[12px] md:w-auto"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Report
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ─── Submit confirm — Dry-run-free flow, same submit handler ─── */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent className="max-w-md rounded-[20px]">
          <DialogClose onClose={closeConfirm} />
          <DialogHeader>
            <DialogTitle>Submit today&apos;s report?</DialogTitle>
            <DialogDescription>
              Reports lock after submission and cannot be edited.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 px-6 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-[var(--text-3)]">Contacted</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">{leadsContacted}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-[var(--text-3)]">Appointments</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">{appointmentsBooked}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-[var(--text-3)]">Deals closed</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">{dealsClosed}</dd>
            </div>
          </dl>
          {allZero && (
            <p className="px-6 text-[12px] text-[var(--text-2)]">All values are 0.</p>
          )}
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmSubmit}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
