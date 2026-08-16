"use server";

import { requireAdmin, logAdminActivity } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createScrapeJob,
  listScrapeJobs,
  updateScrapeJobStatus,
  type CreateScrapeJobInput,
} from "@/lib/scrape-job";
import { revalidatePath } from "next/cache";

// ============================================
// Create Scrape Job
// ============================================

export async function createScrapeJobAction(
  _prev: unknown,
  formData: FormData,
): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    const { profile } = await requireAdmin();

    const input: CreateScrapeJobInput = {
      query: (formData.get("query") as string) || "",
      location: (formData.get("location") as string) || "",
      requested_count: parseInt(
        (formData.get("requested_count") as string) || "0",
        10,
      ),
      extract_emails: formData.get("extract_emails") === "true",
      dry_run: formData.get("dry_run") !== "false", // default true
    };

    const { adminClient } = await import("@/lib/supabase/admin");
    const { job, error } = await createScrapeJob(adminClient, input, profile.id);

    if (error || !job) {
      return { success: false, error: error || "Failed to create scrape job" };
    }

    // Attempt to dispatch GitHub Actions workflow
    const dispatchResult = await dispatchGitHubWorkflow(job.id, input);

    if (!dispatchResult.success) {
      // Update job to failed if dispatch fails
      await updateScrapeJobStatus(adminClient, job.id, {
        status: "failed",
        error_message: dispatchResult.error,
      });

      return {
        success: false,
        error: `Job created but workflow dispatch failed: ${dispatchResult.error}`,
      };
    }

    await logAdminActivity(await createClient(), "scrape_job_created", {
      jobId: job.id,
      query: input.query,
      location: input.location,
      requestedCount: input.requested_count,
      dryRun: input.dry_run,
      adminId: profile.id,
    });

    revalidatePath("/admin/scrape");

    return { success: true, jobId: job.id };
  } catch (err) {
    console.error("Create scrape job error:", err);
    return { success: false, error: "Failed to create scrape job" };
  }
}

// ============================================
// List Scrape Jobs
// ============================================

export async function listScrapeJobsAction() {
  try {
    await requireAdmin();
    const { adminClient } = await import("@/lib/supabase/admin");
    return await listScrapeJobs(adminClient, { limit: 50 });
  } catch (err) {
    console.error("List scrape jobs error:", err);
    return { jobs: [], error: "Failed to fetch scrape jobs" };
  }
}

// ============================================
// Dispatch GitHub Actions Workflow
// ============================================

async function dispatchGitHubWorkflow(
  scrapeJobId: string,
  input: CreateScrapeJobInput,
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.SCRAPER_GITHUB_TOKEN;
  const owner = process.env.SCRAPER_GITHUB_OWNER;
  const repo = process.env.SCRAPER_GITHUB_REPO;
  const workflow = process.env.SCRAPER_GITHUB_WORKFLOW || "scrape.yml";

  if (!token || !owner || !repo) {
    return {
      success: false,
      error: "GitHub Actions not configured (missing SCRAPER_GITHUB_TOKEN, SCRAPER_GITHUB_OWNER, or SCRAPER_GITHUB_REPO)",
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            scrape_job_id: scrapeJobId,
            query: input.query,
            location: input.location,
            requested_count: String(input.requested_count),
            extract_emails: String(input.extract_emails),
            dry_run: String(input.dry_run),
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `GitHub API error ${response.status}: ${body}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
