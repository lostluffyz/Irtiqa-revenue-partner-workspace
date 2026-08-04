// ============================================
// Partner Authorization & Utilities
// ============================================
//
// requirePartner() must be called at the start of every partner Server Action
// to verify the request is from an authenticated, active partner.
//
// The partner uses the regular server client (publishable key, RLS-bound).
// No privileged admin client is used for partner operations.
//
// Business-date logic delegates to program-timezone.ts, which uses the
// configured PROGRAM_TIMEZONE (default: Asia/Kolkata).

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Profile, Partner } from "@/types/database";
import { getBusinessDate, getProgramDay as tzGetProgramDay } from "@/lib/program-timezone";

export type PartnerAuthResult = {
  profile: Profile;
  partner: Partner;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Require the current request is from an authenticated, active partner.
 * Must be called at the start of every partner Server Action.
 *
 * Returns the partner profile, partner record, and authenticated client.
 * Throws if unauthenticated, not a partner, or account is inactive.
 */
export async function requirePartner(): Promise<PartnerAuthResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "partner") {
    throw new Error("Partner access required");
  }

  if (!profile.is_active) {
    throw new Error("Account is deactivated");
  }

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("*")
    .eq("id", user.id)
    .single();

  if (partnerError || !partner) {
    throw new Error("Partner record not found");
  }

  if (partner.status !== "active") {
    throw new Error("Partner account is not active");
  }

  return { profile: profile as unknown as Profile, partner: partner as unknown as Partner, supabase };
}

// ============================================
// Date/Time Utilities
// ============================================

/**
 * Timezone for program day calculations.
 * Reads from PROGRAM_TIMEZONE env var (default: Asia/Kolkata).
 */
export const PROGRAM_TIMEZONE = process.env.PROGRAM_TIMEZONE || "Asia/Kolkata";

/**
 * Calculate the current program day for a partner.
 * Delegates to program-timezone.ts for timezone-aware calculation.
 *
 * @param programStartDate - ISO date string (YYYY-MM-DD)
 * @returns The current program day (1-indexed if active, negative if pre-program)
 */
export function getProgramDay(programStartDate: string): number {
  return tzGetProgramDay(programStartDate);
}

/**
 * Calculate the partner's reporting streak using business dates.
 * Streak = consecutive days with a daily report, ending at the most recent report.
 * Must have a report from today or yesterday (business date) to start counting.
 *
 * @param supabase - Authenticated Supabase client
 * @param partnerId - The partner's UUID
 * @returns Number of consecutive days with reports
 */
export async function calculateStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
): Promise<number> {
  const { data: reports, error } = await supabase
    .from("daily_reports")
    .select("report_date")
    .eq("partner_id", partnerId)
    .order("report_date", { ascending: false });

  if (error || !reports || reports.length === 0) return 0;

  const today = getBusinessDate(PROGRAM_TIMEZONE);
  const yesterdayDate = new Date(today + "T00:00:00Z");
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  // If the most recent report isn't today or yesterday, streak is broken
  if (reports[0].report_date !== today && reports[0].report_date !== yesterday) {
    return 0;
  }

  let streak = 0;
  const cursorDate = new Date(reports[0].report_date + "T00:00:00Z");

  for (const report of reports) {
    const reportDate = new Date(report.report_date + "T00:00:00Z");
    const diff = cursorDate.getTime() - reportDate.getTime();
    const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      streak++;
      cursorDate.setUTCDate(cursorDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ============================================
// Activity Logging
// ============================================

/**
 * Log a partner activity entry.
 * Uses the authenticated user's RLS-bound client.
 */
export async function logPartnerActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
  action: string,
  details?: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("partner_activity_log")
    .insert({
      partner_id: partnerId,
      action,
      details: (details ?? null) as unknown as Record<string, unknown>,
    });

  if (error) {
    console.error("Failed to log partner activity:", error.message);
  }
}

// ============================================
// Zod Schemas
// ============================================

export const LeadStatusUpdateSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
  status: z.enum([
    "not_contacted",
    "contacted",
    "follow_up_required",
    "appointment_booked",
    "closed",
    "not_interested",
    "invalid_contact",
  ]),
});

export const DailyReportSchema = z.object({
  leadsContacted: z.coerce.number().int().min(0, "Must be 0 or more"),
  appointmentsBooked: z.coerce.number().int().min(0, "Must be 0 or more"),
  dealsClosed: z.coerce.number().int().min(0, "Must be 0 or more"),
  biggestChallenge: z.string().max(2000).optional().default(""),
  additionalNotes: z.string().max(5000).optional().default(""),
});
