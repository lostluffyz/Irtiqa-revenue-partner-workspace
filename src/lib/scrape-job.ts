// ============================================
// Scrape Job — Service Layer
// ============================================
//
// Manages Google Maps scrape job lifecycle.
// scrape_job_id (id) is the canonical identifier between
// Vercel → GitHub Actions → Supabase.
//
// Authorization is handled by the caller (server action).

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrapeJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

export interface ScrapeJob {
  id: string;
  status: ScrapeJobStatus;
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
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

// ---------------------------------------------------------------------------
// Validation Schema
// ---------------------------------------------------------------------------

export const CreateScrapeJobSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(500, "Query too long"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(500, "Location too long"),
  requested_count: z
    .number()
    .int()
    .positive("Requested count must be positive")
    .max(1000, "Maximum 1000 leads per job"),
  extract_emails: z.boolean().default(false),
  dry_run: z.boolean().default(true),
});

export type CreateScrapeJobInput = z.infer<typeof CreateScrapeJobSchema>;

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<ScrapeJobStatus, ScrapeJobStatus[]> = {
  pending: ["running", "cancelled", "failed"],
  running: ["completed", "partial", "failed"],
  completed: [],
  partial: [],
  failed: [],
  cancelled: [],
};

export function isValidTransition(
  from: ScrapeJobStatus,
  to: ScrapeJobStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Create scrape job
// ---------------------------------------------------------------------------

export async function createScrapeJob(
  supabase: SupabaseClient,
  input: CreateScrapeJobInput,
  createdBy: string,
): Promise<{ job: ScrapeJob | null; error?: string }> {
  const parsed = CreateScrapeJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      job: null,
      error: parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    };
  }

  const { data, error } = await supabase
    .from("scrape_jobs")
    .insert({
      query: parsed.data.query,
      location: parsed.data.location,
      requested_count: parsed.data.requested_count,
      extract_emails: parsed.data.extract_emails,
      dry_run: parsed.data.dry_run,
      created_by: createdBy,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { job: null, error: error.message };
  }

  return { job: data as ScrapeJob };
}

// ---------------------------------------------------------------------------
// Update scrape job status
// ---------------------------------------------------------------------------

export async function updateScrapeJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  updates: {
    status?: ScrapeJobStatus;
    workflow_run_id?: string;
    scraped_count?: number;
    valid_count?: number;
    inserted_count?: number;
    duplicate_count?: number;
    skipped_count?: number;
    error_count?: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  // Validate status transition if status is being changed
  if (updates.status) {
    const { data: current } = await supabase
      .from("scrape_jobs")
      .select("status")
      .eq("id", jobId)
      .single();

    if (current && !isValidTransition(current.status, updates.status)) {
      return {
        success: false,
        error: `Invalid status transition: ${current.status} → ${updates.status}`,
      };
    }
  }

  const { error } = await supabase
    .from("scrape_jobs")
    .update(updates)
    .eq("id", jobId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get scrape job by ID
// ---------------------------------------------------------------------------

export async function getScrapeJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<{ job: ScrapeJob | null; error?: string }> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    return { job: null, error: error.message };
  }

  return { job: data as ScrapeJob };
}

// ---------------------------------------------------------------------------
// List scrape jobs (most recent first)
// ---------------------------------------------------------------------------

export async function listScrapeJobs(
  supabase: SupabaseClient,
  options: { limit?: number; offset?: number } = {},
): Promise<{ jobs: ScrapeJob[]; total?: number; error?: string }> {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { jobs: [], error: error.message };
  }

  return { jobs: (data || []) as ScrapeJob[] };
}
