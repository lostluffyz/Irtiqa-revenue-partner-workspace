"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createScrapeJobAction,
  listScrapeJobsAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ============================================
// Types
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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

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

  // Form state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [requestedCount, setRequestedCount] = useState("100");
  const [extractEmails, setExtractEmails] = useState(false);
  const [dryRun, setDryRun] = useState(true);

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

  const handleCreateJob = async (isDryRun: boolean) => {
    if (!query.trim() || !location.trim()) {
      setError("Query and location are required");
      return;
    }

    const count = parseInt(requestedCount, 10);
    if (isNaN(count) || count <= 0) {
      setError("Requested count must be a positive number");
      return;
    }

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-1)]">
          Lead Scraper
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Scrape business leads from Google Maps • Powered by GitHub Actions
        </p>
      </div>

      {/* Create Job Form */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6">
        <h2 className="text-lg font-medium text-[var(--text-1)] mb-4">
          Create Scrape Job
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-1">
              Search Query
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. software companies"
              disabled={creating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-1">
              Location
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Germany"
              disabled={creating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-1">
              Requested Leads
            </label>
            <Input
              type="number"
              value={requestedCount}
              onChange={(e) => setRequestedCount(e.target.value)}
              min="1"
              max="1000"
              disabled={creating}
            />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <input
                type="checkbox"
                checked={extractEmails}
                onChange={(e) => setExtractEmails(e.target.checked)}
                disabled={creating}
                className="rounded"
              />
              Extract Emails
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                disabled={creating}
                className="rounded"
              />
              Dry Run
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {lastResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Job {lastResult.dryRun ? "created (dry run)" : "dispatched"}:{" "}
            {lastResult.jobId.slice(0, 8)}...
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCreateJob(true)}
            disabled={creating}
          >
            {creating ? "Creating..." : "Dry Run"}
          </Button>
          <Button
            size="sm"
            onClick={() => handleCreateJob(false)}
            disabled={creating}
          >
            {creating ? "Dispatching..." : "Start Scrape"}
          </Button>
        </div>
      </div>

      {/* Jobs Table */}
      <div>
        <h2 className="text-lg font-medium text-[var(--text-1)] mb-4">
          Scrape Jobs
        </h2>

        {loading ? (
          <div className="text-center py-12 text-[var(--text-3)]">
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-3)]">
            No scrape jobs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">
                    Query
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">
                    Location
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">
                    Requested
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">
                    Scraped
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">
                    New
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">
                    Dups
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">
                    Skipped
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--hover-bg)]"
                  >
                    <td className="py-3 px-4 font-medium text-[var(--text-1)]">
                      {job.query}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-2)]">
                      {job.location}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-2)]">
                      {job.requested_count}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-2)]">
                      {job.scraped_count}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-2)]">
                      {job.inserted_count}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-2)]">
                      {job.duplicate_count}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-2)]">
                      {job.skipped_count}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={`text-xs ${STATUS_COLORS[job.status] || ""}`}
                      >
                        {job.status}
                      </Badge>
                      {job.error_message && (
                        <p className="text-xs text-red-600 mt-1 max-w-48 truncate">
                          {job.error_message}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-3)]">
                      {formatDate(job.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
