// ============================================
// Lead Allocation — Core Service
// ============================================
//
// Pure helpers + DB-backed allocation logic.
// Reuses existing program_start_date column.
// Never invents or overwrites partner dates.

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_PROGRAM_LEAD_LIMIT = 400;
export const DEFAULT_WEEKLY_LEAD_LIMIT = 100;
export const ALLOCATION_PERIOD_DAYS = 7;
export const PROGRAM_DURATION_DAYS = 30;

// ---------------------------------------------------------------------------
// Pure date helpers (no DB)
// ---------------------------------------------------------------------------

export function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysISO(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get the 7-day allocation period window for a partner on a given date.
 * Periods are aligned to the partner's program_start_date.
 *
 * @returns [periodStart, periodEnd) — periodEnd is exclusive
 */
export function getCurrentAllocationPeriod(
  programStartDate: string,
  today: string,
): { start: string; end: string; dayInPeriod: number } {
  const daysSinceStart = diffDaysISO(programStartDate, today);
  if (daysSinceStart < 0) {
    return { start: programStartDate, end: addDaysISO(programStartDate, ALLOCATION_PERIOD_DAYS), dayInPeriod: 0 };
  }
  const periodIndex = Math.floor(daysSinceStart / ALLOCATION_PERIOD_DAYS);
  const periodStart = addDaysISO(programStartDate, periodIndex * ALLOCATION_PERIOD_DAYS);
  const periodEnd = addDaysISO(periodStart, ALLOCATION_PERIOD_DAYS);
  const dayInPeriod = (daysSinceStart % ALLOCATION_PERIOD_DAYS) + 1;
  return { start: periodStart, end: periodEnd, dayInPeriod };
}

/**
 * Check if a partner's program is eligible for allocation today.
 */
export function isProgramEligible(
  programStartDate: string,
  today: string,
  allocationEnabled: boolean,
): { eligible: boolean; reason: string } {
  if (!allocationEnabled) {
    return { eligible: false, reason: "Allocation disabled for this partner" };
  }
  const daysSinceStart = diffDaysISO(programStartDate, today);
  if (daysSinceStart < 0) {
    return { eligible: false, reason: "Program has not started yet" };
  }
  const programDay = daysSinceStart + 1;
  if (programDay > PROGRAM_DURATION_DAYS) {
    return { eligible: false, reason: "Program has expired" };
  }
  return { eligible: true, reason: "" };
}

// ---------------------------------------------------------------------------
// Allocation state (pure computation)
// ---------------------------------------------------------------------------

export interface AllocationState {
  partnerId: string;
  programStartDate: string;
  programDay: number;
  programElapsed: number;
  programRemaining: number;
  programExpired: boolean;
  totalAssigned: number;
  effectiveProgramLimit: number;
  approvedExtraLeads: number;
  programCapacity: number;
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyCapacity: number;
  periodStart: string;
  periodEnd: string;
  dayInPeriod: number;
  allocationEnabled: boolean;
  eligible: boolean;
  eligibleReason: string;
}

export function computeAllocationState(params: {
  partnerId: string;
  programStartDate: string;
  today: string;
  totalAssigned: number;
  effectiveProgramLimit: number;
  approvedExtraLeads: number;
  weeklyLimit: number;
  weeklyUsed: number;
  allocationEnabled: boolean;
}): AllocationState {
  const {
    partnerId,
    programStartDate,
    today,
    totalAssigned,
    effectiveProgramLimit,
    approvedExtraLeads,
    weeklyLimit,
    weeklyUsed,
    allocationEnabled,
  } = params;

  const daysSinceStart = diffDaysISO(programStartDate, today);
  const programDay = daysSinceStart < 0 ? 0 : Math.min(daysSinceStart + 1, PROGRAM_DURATION_DAYS);
  const programExpired = daysSinceStart >= PROGRAM_DURATION_DAYS;
  const programRemaining = Math.max(0, effectiveProgramLimit - totalAssigned);
  const programCapacity = programRemaining;
  const weeklyCapacity = Math.max(0, weeklyLimit - weeklyUsed);

  const { start, end, dayInPeriod } = getCurrentAllocationPeriod(programStartDate, today);
  const { eligible, reason } = isProgramEligible(programStartDate, today, allocationEnabled);

  return {
    partnerId,
    programStartDate,
    programDay,
    programElapsed: daysSinceStart < 0 ? 0 : Math.min(daysSinceStart + 1, PROGRAM_DURATION_DAYS),
    programRemaining,
    programExpired,
    totalAssigned,
    effectiveProgramLimit,
    approvedExtraLeads,
    programCapacity,
    weeklyLimit,
    weeklyUsed,
    weeklyCapacity,
    periodStart: start,
    periodEnd: end,
    dayInPeriod,
    allocationEnabled,
    eligible,
    eligibleReason: reason,
  };
}

// ---------------------------------------------------------------------------
// Allocation report (admin view)
// ---------------------------------------------------------------------------

export interface AllocationReportRow {
  partnerId: string;
  companyId: string;
  partnerName: string;
  status: string;
  programStartDate: string;
  programDay: number;
  programExpired: boolean;
  totalAssigned: number;
  effectiveProgramLimit: number;
  approvedExtraLeads: number;
  programCapacity: number;
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyCapacity: number;
  periodStart: string;
  periodEnd: string;
  lastBatchAt: string | null;
  allocationEnabled: boolean;
}

export async function getAllocationReport(
  supabase: SupabaseClient,
): Promise<{ rows: AllocationReportRow[]; error?: string }> {
  const today = todayISO();

  // Fetch all active partners with allocation columns
  const { data: partners, error: pErr } = await supabase
    .from("partners")
    .select(`
      id,
      company_id,
      status,
      program_start_date,
      default_program_lead_limit,
      default_weekly_lead_limit,
      approved_extra_leads,
      weekly_lead_limit_override,
      allocation_enabled,
      profiles!inner(full_name)
    `)
    .in("status", ["active", "inactive"]);

  if (pErr || !partners) {
    return { rows: [], error: pErr?.message ?? "Failed to fetch partners" };
  }

  // Fetch assigned lead counts
  const partnerIds = partners.map((p: { id: string }) => p.id);
  const { data: counts } = await supabase
    .from("leads")
    .select("assigned_to")
    .in("assigned_to", partnerIds);

  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    const pid = row.assigned_to as string;
    countMap.set(pid, (countMap.get(pid) || 0) + 1);
  }

  // Fetch weekly batch sums for current periods
  const rows: AllocationReportRow[] = [];

  for (const p of partners) {
    const profiles = p.profiles as { full_name: string } | { full_name: string }[] | null;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    const partnerName = profile?.full_name || p.company_id;

    const effectiveLimit = p.default_program_lead_limit + p.approved_extra_leads;
    const weeklyLimit = p.weekly_lead_limit_override ?? p.default_weekly_lead_limit;
    const totalAssigned = countMap.get(p.id) || 0;

    // Get current period's weekly usage
    const { start: periodStart, end: periodEnd } = getCurrentAllocationPeriod(p.program_start_date, today);

    const { data: weekBatches } = await supabase
      .from("lead_allocation_batches")
      .select("lead_count")
      .eq("partner_id", p.id)
      .eq("allocation_period_start", periodStart);

    const weeklyUsed = (weekBatches || []).reduce(
      (sum: number, b: { lead_count: number }) => sum + b.lead_count,
      0,
    );

    // Get last batch timestamp
    const { data: lastBatch } = await supabase
      .from("lead_allocation_batches")
      .select("created_at")
      .eq("partner_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const state = computeAllocationState({
      partnerId: p.id,
      programStartDate: p.program_start_date,
      today,
      totalAssigned,
      effectiveProgramLimit: effectiveLimit,
      approvedExtraLeads: p.approved_extra_leads,
      weeklyLimit,
      weeklyUsed,
      allocationEnabled: p.allocation_enabled,
    });

    rows.push({
      partnerId: p.id,
      companyId: p.company_id,
      partnerName,
      status: p.status,
      programStartDate: p.program_start_date,
      programDay: state.programDay,
      programExpired: state.programExpired,
      totalAssigned: state.totalAssigned,
      effectiveProgramLimit: state.effectiveProgramLimit,
      approvedExtraLeads: state.approvedExtraLeads,
      programCapacity: state.programCapacity,
      weeklyLimit: state.weeklyLimit,
      weeklyUsed: state.weeklyUsed,
      weeklyCapacity: state.weeklyCapacity,
      periodStart: state.periodStart,
      periodEnd: state.periodEnd,
      lastBatchAt: lastBatch?.created_at ?? null,
      allocationEnabled: p.allocation_enabled,
    });
  }

  return { rows };
}

// ---------------------------------------------------------------------------
// Single partner allocation state (for detail page)
// ---------------------------------------------------------------------------

export async function getPartnerAllocationState(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<{ state: AllocationState | null; batches: AllocationBatchRow[]; error?: string }> {
  const today = todayISO();

  const { data: partner, error: pErr } = await supabase
    .from("partners")
    .select(`
      id,
      program_start_date,
      default_program_lead_limit,
      default_weekly_lead_limit,
      approved_extra_leads,
      weekly_lead_limit_override,
      allocation_enabled
    `)
    .eq("id", partnerId)
    .single();

  if (pErr || !partner) {
    return { state: null, batches: [], error: pErr?.message ?? "Partner not found" };
  }

  const { count: totalAssigned } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", partnerId);

  const effectiveLimit = partner.default_program_lead_limit + partner.approved_extra_leads;
  const weeklyLimit = partner.weekly_lead_limit_override ?? partner.default_weekly_lead_limit;

  const { start: periodStart } = getCurrentAllocationPeriod(partner.program_start_date, today);

  const { data: weekBatches } = await supabase
    .from("lead_allocation_batches")
    .select("lead_count")
    .eq("partner_id", partnerId)
    .eq("allocation_period_start", periodStart);

  const weeklyUsed = (weekBatches || []).reduce(
    (sum: number, b: { lead_count: number }) => sum + b.lead_count,
    0,
  );

  const state = computeAllocationState({
    partnerId,
    programStartDate: partner.program_start_date,
    today,
    totalAssigned: totalAssigned || 0,
    effectiveProgramLimit: effectiveLimit,
    approvedExtraLeads: partner.approved_extra_leads,
    weeklyLimit,
    weeklyUsed,
    allocationEnabled: partner.allocation_enabled,
  });

  // Fetch recent batches
  const { data: batches } = await supabase
    .from("lead_allocation_batches")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    state,
    batches: (batches || []) as AllocationBatchRow[],
  };
}

// ---------------------------------------------------------------------------
// Allocation batch row type
// ---------------------------------------------------------------------------

export interface AllocationBatchRow {
  id: string;
  partner_id: string;
  allocation_period_start: string;
  allocation_period_end: string;
  lead_count: number;
  program_total_after: number;
  source: string;
  triggered_by: string | null;
  reason: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Automatic allocation runner (scheduler)
// ---------------------------------------------------------------------------

export interface AllocationRunResult {
  partnerId: string;
  partnerName: string;
  eligible: boolean;
  reason: string;
  assigned: number;
  programCapacity: number;
  weeklyCapacity: number;
}

/**
 * Run automatic allocation for all eligible partners.
 * Designed to be called by a weekly Vercel cron job (Monday 06:00 UTC).
 *
 * @param dryRun - If true, returns what would happen without writing
 */
export async function runAutomaticAllocation(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {},
): Promise<{ results: AllocationRunResult[]; errors: string[] }> {
  const dryRun = options.dryRun ?? false;
  const today = todayISO();
  const errors: string[] = [];
  const results: AllocationRunResult[] = [];

  // Fetch all active partners with allocation enabled
  const { data: partners, error: pErr } = await supabase
    .from("partners")
    .select(`
      id,
      company_id,
      status,
      program_start_date,
      default_program_lead_limit,
      default_weekly_lead_limit,
      approved_extra_leads,
      weekly_lead_limit_override,
      allocation_enabled,
      profiles!inner(full_name)
    `)
    .eq("status", "active")
    .eq("allocation_enabled", true);

  if (pErr || !partners) {
    return { results: [], errors: [pErr?.message ?? "Failed to fetch partners"] };
  }

  for (const p of partners) {
    const profiles = p.profiles as { full_name: string } | { full_name: string }[] | null;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    const partnerName = profile?.full_name || p.company_id;

    // Check program eligibility
    const { eligible, reason } = isProgramEligible(p.program_start_date, today, true);
    if (!eligible) {
      results.push({
        partnerId: p.id,
        partnerName,
        eligible: false,
        reason,
        assigned: 0,
        programCapacity: 0,
        weeklyCapacity: 0,
      });
      continue;
    }

    // Check if there's already an automatic batch for this period
    const { start: periodStart, end: periodEnd } = getCurrentAllocationPeriod(p.program_start_date, today);

    if (!dryRun) {
      const { data: existing } = await supabase
        .from("lead_allocation_batches")
        .select("id")
        .eq("partner_id", p.id)
        .eq("allocation_period_start", periodStart)
        .eq("source", "automatic")
        .maybeSingle();

      if (existing) {
        // Already allocated this period — skip
        results.push({
          partnerId: p.id,
          partnerName,
          eligible: true,
          reason: "Already allocated for this period",
          assigned: 0,
          programCapacity: 0,
          weeklyCapacity: 0,
        });
        continue;
      }
    }

    // Compute capacity
    const { count: totalAssigned } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", p.id);

    const effectiveLimit = p.default_program_lead_limit + p.approved_extra_leads;
    const weeklyLimit = p.weekly_lead_limit_override ?? p.default_weekly_lead_limit;

    const { data: weekBatches } = await supabase
      .from("lead_allocation_batches")
      .select("lead_count")
      .eq("partner_id", p.id)
      .eq("allocation_period_start", periodStart);

    const weeklyUsed = (weekBatches || []).reduce(
      (sum: number, b: { lead_count: number }) => sum + b.lead_count,
      0,
    );

    const programCapacity = Math.max(0, effectiveLimit - (totalAssigned || 0));
    const weeklyCapacity = Math.max(0, weeklyLimit - weeklyUsed);
    const maxCount = Math.min(programCapacity, weeklyCapacity, DEFAULT_WEEKLY_LEAD_LIMIT);

    if (maxCount <= 0) {
      results.push({
        partnerId: p.id,
        partnerName,
        eligible: true,
        reason: "No capacity remaining",
        assigned: 0,
        programCapacity,
        weeklyCapacity,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        partnerId: p.id,
        partnerName,
        eligible: true,
        reason: "Ready to allocate",
        assigned: maxCount,
        programCapacity,
        weeklyCapacity,
      });
      continue;
    }

    // Call the RPC to atomically claim + record
    const { data: assigned, error: rpcErr } = await supabase.rpc(
      "allocate_automatic_batch",
      {
        p_partner_id: p.id,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_max_count: maxCount,
        p_reason: "scheduled",
      },
    );

    if (rpcErr) {
      errors.push(`Partner ${p.company_id}: ${rpcErr.message}`);
      continue;
    }

    results.push({
      partnerId: p.id,
      partnerName,
      eligible: true,
      reason: "Allocated",
      assigned: assigned || 0,
      programCapacity,
      weeklyCapacity,
    });
  }

  return { results, errors };
}

// ---------------------------------------------------------------------------
// Capacity check helpers (for manual + smart assignment paths)
// ---------------------------------------------------------------------------

export interface CapacityCheckResult {
  allowed: boolean;
  effectiveProgramLimit: number;
  weeklyLimit: number;
  totalAssigned: number;
  weeklyUsed: number;
  programRemaining: number;
  weeklyRemaining: number;
  message: string;
}

/**
 * Check if assigning `count` leads to a partner would exceed capacity.
 * Used by manual and smart assignment paths to warn or block.
 */
export async function checkPartnerCapacity(
  supabase: SupabaseClient,
  partnerId: string,
  requestedCount: number,
): Promise<CapacityCheckResult> {
  const today = todayISO();

  const { data: partner, error: pErr } = await supabase
    .from("partners")
    .select(`
      id,
      program_start_date,
      default_program_lead_limit,
      default_weekly_lead_limit,
      approved_extra_leads,
      weekly_lead_limit_override,
      allocation_enabled
    `)
    .eq("id", partnerId)
    .single();

  if (pErr || !partner) {
    return {
      allowed: false,
      effectiveProgramLimit: 0,
      weeklyLimit: 0,
      totalAssigned: 0,
      weeklyUsed: 0,
      programRemaining: 0,
      weeklyRemaining: 0,
      message: "Partner not found",
    };
  }

  const { count: totalAssigned } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", partnerId);

  const effectiveLimit = partner.default_program_lead_limit + partner.approved_extra_leads;
  const weeklyLimit = partner.weekly_lead_limit_override ?? partner.default_weekly_lead_limit;

  const { start: periodStart } = getCurrentAllocationPeriod(partner.program_start_date, today);

  const { data: weekBatches } = await supabase
    .from("lead_allocation_batches")
    .select("lead_count")
    .eq("partner_id", partnerId)
    .eq("allocation_period_start", periodStart);

  const weeklyUsed = (weekBatches || []).reduce(
    (sum: number, b: { lead_count: number }) => sum + b.lead_count,
    0,
  );

  const programRemaining = Math.max(0, effectiveLimit - (totalAssigned || 0));
  const weeklyRemaining = Math.max(0, weeklyLimit - weeklyUsed);
  const maxAllowed = Math.min(programRemaining, weeklyRemaining);
  const allowed = requestedCount <= maxAllowed;

  const messages: string[] = [];
  if (!allowed) {
    if (requestedCount > programRemaining) {
      messages.push(`Program capacity: ${programRemaining} remaining (limit ${effectiveLimit}, assigned ${totalAssigned || 0})`);
    }
    if (requestedCount > weeklyRemaining) {
      messages.push(`Weekly capacity: ${weeklyRemaining} remaining (limit ${weeklyLimit}, used ${weeklyUsed})`);
    }
  }

  return {
    allowed,
    effectiveProgramLimit: effectiveLimit,
    weeklyLimit,
    totalAssigned: totalAssigned || 0,
    weeklyUsed,
    programRemaining,
    weeklyRemaining,
    message: allowed ? "" : messages.join(". "),
  };
}
