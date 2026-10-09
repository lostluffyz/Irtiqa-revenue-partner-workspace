"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createScrapeJobAction,
  listScrapeJobsAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader, Separator } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatJobDateTime, getViewerShortZoneName } from "@/components/dashboard/helpers";

// ============================================
// Types (unchanged)
// ============================================

interface ScrapeJob {
  id: string;
  status: string;
  query: string;
  location: string;
  requested_count: number;
  extract_emails: boolean;
  dry_run: boolean;
  scraped_count: number;
  valid_count: number;
  inserted_count: number;
  duplicate_count: number;
  skipped_count: number;
  error_count: number;
  workflow_run_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

type JobVariant = "success" | "warning" | "danger" | "default" | "info";

function statusVariant(status: string): JobVariant {
  if (status === "completed") return "success";
  if (status === "partial") return "warning";
  if (status === "failed") return "danger";
  if (status === "cancelled") return "default";
  return "info";
}

// A pending/running job older than this never resolves on its own:
// the workflow times out after 15 minutes, so 60 minutes (4x) means stuck.
const STUCK_AFTER_MINUTES = 60;

function isPossiblyStuck(job: ScrapeJob, nowMs: number): boolean {
  if (job.status !== "pending" && job.status !== "running") return false;
  const since = new Date(job.started_at ?? job.created_at).getTime();
  if (Number.isNaN(since)) return false;
  return nowMs - since > STUCK_AFTER_MINUTES * 60 * 1000;
}

function StatusPill({ status, stuck }: { status: string; stuck: boolean }) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1.5">
        <Badge variant={statusVariant(status)} className="text-[11px] whitespace-nowrap capitalize">
          {status}
        </Badge>
        {status === "running" && (
          <span
            aria-hidden="true"
            className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
          />
        )}
      </span>
      {stuck && (
        <span
          className="text-[11px] text-[var(--text-3)]"
          title="No update for over an hour. The workflow times out after 15 minutes, so this job will not resolve on its own."
        >
          Possibly stuck
        </span>
      )}
    </span>
  );
}

function Num({ value, mutedZero = true }: { value: number; mutedZero?: boolean }) {
  const zero = mutedZero && value === 0;
  return (
    <span className={`tabular-nums ${zero ? "text-[var(--text-3)]" : "text-[var(--text-1)]"}`}>
      {value}
    </span>
  );
}

// Single source for the create-job validity check. Used both by the
// submit handler and by the Start button to decide whether the confirm
// dialog may open. Same messages, same behavior, no duplication.
function validateScrapeForm(query: string, location: string, requestedCount: string): string | null {
  if (!query.trim() || !location.trim()) {
    return "Query and location are required";
  }
  const count = parseInt(requestedCount, 10);
  if (isNaN(count) || count <= 0) {
    return "Requested count must be a positive number";
  }
  return null;
}

// ============================================
// Scrape Page
// ============================================

export default function ScrapePage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    jobId: string;
    dryRun: boolean;
  } | null>(null);
  // "Now" for the stuck-job hint — resolved after paint (rAF) so the
  // server render and hydration stay pure; the hint simply appears a
  // frame later. Same pattern as useAdminGreeting.
  const [nowMs, setNowMs] = useState(0);
  // Viewer timezone label for the Created header — same deferred pattern.
  const [tzLabel, setTzLabel] = useState<string | null>(null);

  // Form state (defaults unchanged)
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [requestedCount, setRequestedCount] = useState("100");
  const [extractEmails, setExtractEmails] = useState(false);
  // Live-scrape confirm dialog + trigger ref (focus returns to Start on close)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startBtnRef = useRef<HTMLButtonElement>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const result = await listScrapeJobsAction();
    if (result.error) {
      setError(result.error);
    } else {
      setJobs(result.jobs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setNowMs(Date.now());
      setTzLabel(getViewerShortZoneName());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const closeConfirm = () => {
    setConfirmOpen(false);
    startBtnRef.current?.focus();
  };

  const handleCreateJob = async (isDryRun: boolean) => {
    const validationError = validateScrapeForm(query, location, requestedCount);
    if (validationError) {
      setError(validationError);
      return;
    }
    const count = parseInt(requestedCount, 10);

    setCreating(true);
    setError(null);
    setLastResult(null);

    const formData = new FormData();
    formData.set("query", query.trim());
    formData.set("location", location.trim());
    formData.set("requested_count", String(count));
    formData.set("extract_emails", String(extractEmails));
    formData.set("dry_run", String(isDryRun));

    const result = await createScrapeJobAction(null, formData);

    if (result.error) {
      setError(result.error);
    } else {
      setLastResult({
        jobId: result.jobId || "",
        dryRun: isDryRun,
      });
      fetchJobs();
    }

    setCreating(false);
  };

  // Summary figures from already-loaded jobs only
  const totalJobs = jobs.length;
  const leadsAdded = jobs.reduce((sum, j) => sum + j.inserted_count, 0);
  const lastRun = jobs.length > 0 ? jobs[0] : null;
  const statusCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <PageHeader
        title="Lead Scraper"
        description="Find businesses on Google Maps and add them to your lead pool."
      />

      {/* Create Job card */}
      <div className="surface p-5">
        <h2 className="text-[15px] font-semibold text-[var(--text-1)]">New scrape job</h2>
        <p className="mt-0.5 text-[13px] text-[var(--text-3)]">
          Runs in GitHub Actions and writes results back here.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-2)]" htmlFor="scrape-query">
              Search query
            </label>
            <Input
              id="scrape-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="software companies"
              disabled={creating}
              className="min-h-[44px] md:min-h-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-2)]" htmlFor="scrape-location">
              Location
            </label>
            <Input
              id="scrape-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Berlin, Germany"
              disabled={creating}
              className="min-h-[44px] md:min-h-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-2)]" htmlFor="scrape-count">
              Requested leads
            </label>
            <Input
              id="scrape-count"
              type="number"
              value={requestedCount}
              onChange={(e) => setRequestedCount(e.target.value)}
              min="1"
              max="1000"
              disabled={creating}
              className="min-h-[44px] tabular-nums md:min-h-0"
            />
            <p className="mt-1 text-[12px] text-[var(--text-3)]">
              Default 100. Maximum 1000 leads per job.
            </p>
          </div>
          <div className="flex flex-col justify-start gap-1 sm:pt-6">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text-1)] md:min-h-0">
              <input
                type="checkbox"
                checked={extractEmails}
                onChange={(e) => setExtractEmails(e.target.checked)}
                disabled={creating}
                className="lead-checkbox h-5 w-5 shrink-0"
              />
              <span>
                Extract emails
                <span className="block text-[12px] font-normal text-[var(--text-3)]">
                  Also look for emails on business websites (slower).
                </span>
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div
            className="mt-4 rounded-[10px] border border-[var(--status-danger)]/25 bg-[var(--status-danger-bg)] p-3 text-sm text-[var(--status-danger)]"
            role="alert"
          >
            {error}
          </div>
        )}

        {lastResult && (
          <div
            className="mt-4 rounded-[10px] border border-[var(--status-success)]/25 bg-[var(--status-success-bg)] p-3 text-sm text-[var(--status-success)]"
            role="status"
          >
            Job {lastResult.dryRun ? "created (dry run)" : "dispatched"}:{" "}
            {lastResult.jobId.slice(0, 8)}...
          </div>
        )}

        {/* Mode guide — the two buttons decide the mode, always */}
        <div className="mt-4 space-y-1.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--canvas)] p-3 text-[12px] leading-relaxed">
          <p className="text-[var(--text-2)]">
            <span className="font-medium text-[var(--text-1)]">Dry Run</span> — preview only,
            nothing is added to your pool.
          </p>
          <p className="text-[var(--status-warning)]">
            <span className="font-medium">Start Scrape</span> — live run, new leads are added
            to the unassigned pool.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCreateJob(true)}
            disabled={creating}
            className="min-h-[44px] w-full sm:w-auto md:min-h-0"
          >
            {creating ? "Creating..." : "Dry Run"}
          </Button>
          <Button
            ref={startBtnRef}
            size="sm"
            onClick={() => {
              const validationError = validateScrapeForm(query, location, requestedCount);
              if (validationError) {
                setError(validationError);
                return;
              }
              setConfirmOpen(true);
            }}
            disabled={creating}
            className="min-h-[44px] w-full sm:w-auto md:min-h-0"
          >
            {creating ? "Dispatching..." : "Start Scrape"}
          </Button>
        </div>
      </div>

      {/* Summary strip — from loaded jobs only */}
      {!loading && jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Scrape summary">
          <p className="text-[13px] text-[var(--text-2)] tabular-nums">
            <span className="font-semibold text-[var(--text-1)]">{totalJobs}</span> jobs
          </p>
          <p className="text-[13px] text-[var(--text-2)] tabular-nums">
            <span className="font-semibold text-[var(--text-1)]">{leadsAdded}</span> leads added
          </p>
          {lastRun && (
            <p
              className="text-[13px] text-[var(--text-2)] tabular-nums"
              title={lastRun.created_at}
            >
              Last run {formatJobDateTime(lastRun.created_at)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(statusCounts).map(([status, count]) => (
              <span
                key={status}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-2)]"
              >
                <span className="capitalize">{status}</span> {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Jobs list */}
      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-[var(--text-1)]">Scrape jobs</h2>

        {loading ? (
          <div className="surface overflow-hidden" aria-busy="true" aria-label="Loading scrape jobs">
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="dl-skeleton h-4 flex-1 rounded-[var(--radius-sm)]" />
                  <div className="dl-skeleton h-4 w-16 shrink-0 rounded-[var(--radius-sm)]" />
                  <div className="dl-skeleton h-6 w-20 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="surface px-5 py-12 text-center">
            <p className="text-[14px] font-medium text-[var(--text-1)]">No scrape jobs yet.</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--text-3)]">
              Create your first job above — try a Dry Run to preview what would be found
              before adding real leads.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="surface hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[#FAFAF8]">
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap">
                        Query
                      </th>
                      <th className="w-[90px] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap tabular-nums">
                        Requested
                      </th>
                      <th className="w-[90px] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap tabular-nums">
                        Scraped
                      </th>
                      <th className="w-[80px] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap tabular-nums">
                        New
                      </th>
                      <th className="w-[80px] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap tabular-nums">
                        Dups
                      </th>
                      <th className="w-[80px] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap tabular-nums">
                        Skipped
                      </th>
                      <th className="w-[140px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">
                        Status
                      </th>
                      <th
                        className="w-[140px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]"
                        title={tzLabel ? `All times shown in ${tzLabel}` : "All times shown in your local timezone"}
                      >
                        <span className="whitespace-nowrap">Created</span>
                        {tzLabel && (
                          <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-[var(--text-3)]">
                            {tzLabel}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150 hover:bg-[var(--hover-bg)]"
                      >
                        <td className="px-4 py-2.5">
                          <p className="truncate text-[13px] font-medium text-[var(--text-1)]" title={`${job.query} — ${job.location}`}>
                            {job.query}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-[var(--text-3)]">
                            {job.location}
                            {job.extract_emails && " · emails"}
                          </p>
                          {job.dry_run && (
                            <span className="mt-1 inline-block rounded-full border border-[var(--border)] bg-[var(--canvas)] px-2 py-px text-[10px] font-medium uppercase tracking-wide text-[var(--text-2)]">
                              Dry run
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] text-[var(--text-2)]">
                          <Num value={job.requested_count} mutedZero={false} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          <Num value={job.scraped_count} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] font-medium">
                          <Num value={job.inserted_count} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          <Num value={job.duplicate_count} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          <Num value={job.skipped_count} />
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={job.status} stuck={isPossiblyStuck(job, nowMs)} />
                          {job.error_message && (
                            <p className="mt-1 max-w-full truncate text-xs text-[var(--status-danger)]" title={job.error_message}>
                              {job.error_message}
                            </p>
                          )}
                        </td>
                        <td
                          className="px-4 py-2.5 text-[12px] tabular-nums text-[var(--text-2)] whitespace-nowrap"
                          title={job.created_at}
                        >
                          {formatJobDateTime(job.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards — same data */}
            <div className="space-y-2 md:hidden">
              {jobs.map((job) => (
                <div key={job.id} className="surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-[var(--text-1)]" title={`${job.query} — ${job.location}`}>
                        {job.query}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--text-3)]">
                        {job.location}
                        {job.extract_emails && " · emails"}
                      </p>
                    </div>
                    <StatusPill status={job.status} stuck={isPossiblyStuck(job, nowMs)} />
                  </div>
                  {job.dry_run && (
                    <span className="mt-2 inline-block rounded-full border border-[var(--border)] bg-[var(--canvas)] px-2 py-px text-[10px] font-medium uppercase tracking-wide text-[var(--text-2)]">
                      Dry run
                    </span>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-3 text-center">
                    {[
                      { label: "Requested", value: job.requested_count, muted: false },
                      { label: "Scraped", value: job.scraped_count, muted: true },
                      { label: "New", value: job.inserted_count, muted: true },
                      { label: "Duplicates", value: job.duplicate_count, muted: true },
                      { label: "Skipped", value: job.skipped_count, muted: true },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-[15px] font-semibold tabular-nums">
                          <Num value={s.value} mutedZero={s.muted} />
                        </p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-3)]">
                          {s.label}
                        </p>
                      </div>
                    ))}
                    <div>
                      <p
                        className="truncate text-[12px] tabular-nums text-[var(--text-2)]"
                        title={job.created_at}
                      >
                        {formatJobDateTime(job.created_at)}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-3)]">
                        Created
                      </p>
                    </div>
                  </div>
                  {job.error_message && (
                    <p className="mt-2 truncate text-xs text-[var(--status-danger)]" title={job.error_message}>
                      {job.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Live-run confirm — Dry Run starts immediately, no dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose onClose={closeConfirm} />
          <DialogHeader>
            <DialogTitle>Start live scrape?</DialogTitle>
            <DialogDescription>
              This runs a real scrape. Leads will be added to the unassigned pool.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 px-6 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-[var(--text-3)]">Query</dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-[var(--text-1)]" title={query.trim()}>{query.trim()}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-[var(--text-3)]">Location</dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-[var(--text-1)]" title={location.trim()}>{location.trim()}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-[var(--text-3)]">Requested</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">{parseInt(requestedCount, 10)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-[var(--text-3)]">Extract emails</dt>
              <dd className="font-medium text-[var(--text-1)]">{extractEmails ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConfirmOpen(false);
                handleCreateJob(false);
              }}
            >
              Start live scrape
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
