// ============================================
// Lead Assignment — Service Layer
// ============================================
//
// All business logic for smart lead assignment lives here.
// Server actions are thin wrappers that call these functions.
// Usable by APIs, background jobs, automated workflows.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAutoBalance, type PartnerLoad } from "./distribution";
import { processBatch, shuffle } from "./batch-processor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmartAssignmentParams {
  partnerIds: string[];
  method: string;
  limit: number;
  country?: string;
  state?: string;
  city?: string;
  industry?: string;
  status?: string;
  domain?: string;
  timeRange?: string;
}

export interface PartnerLoadInfo {
  partnerId: string;
  partnerName: string;
  companyId: string;
  currentLoad: number;
}

export interface DistributionEntry {
  partnerId: string;
  partnerName: string;
  currentLoad: number;
  incoming: number;
  finalTotal: number;
}

export interface AssignmentPreview {
  requested: number;
  matching: number;
  available: number;
  willAssign: number;
  skipped: number;
  partnerLoads: PartnerLoadInfo[];
  distribution: DistributionEntry[];
  previewLeads: {
    id: string;
    company_name: string;
    country: string;
    status: string;
  }[];
  skipBreakdown: {
    alreadyAssigned: number;
    noMatch: number;
    missingData: number;
  };
}

export interface PartnerAssignmentResult {
  partnerId: string;
  partnerName: string;
  assigned: number;
  skipped: number;
}

export interface AssignmentResult {
  assigned: number;
  skipped: number;
  distribution: PartnerAssignmentResult[];
  batchCount: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

/**
 * Apply method-specific filters to a Supabase query builder.
 * Shared by preview and execute flows.
 */
export function buildFilters(
  query: QueryBuilder,
  method: string,
  params: SmartAssignmentParams,
): QueryBuilder {
  if (params.country) {
    query = query.eq("country", params.country);
  }
  if (params.state) {
    query = query.eq("state", params.state);
  }
  if (params.city) {
    query = query.eq("city", params.city);
  }
  if (params.industry) {
    query = query.eq("industry", params.industry);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.domain && method === "website_domain") {
    query = query.ilike("website", `%${params.domain}%`);
  }
  if (method === "recently_imported" && params.timeRange) {
    const now = new Date();
    let cutoff: Date;
    switch (params.timeRange) {
      case "today":
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this_week":
        cutoff = new Date(now.getTime() - 7 * 86400000);
        break;
      case "last_30_days":
        cutoff = new Date(now.getTime() - 30 * 86400000);
        break;
      case "last_import":
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        cutoff = new Date(0);
    }
    query = query.gte("created_at", cutoff.toISOString());
  }
  return query;
}

/**
 * Build a filter query for unassigned leads.
 *
 * IMPORTANT: never combine `assigned_to IS NULL` with a `NOT IN`/`!=` filter on
 * `assigned_to`. Under SQL three-valued logic, `NULL NOT IN (...)` and
 * `NULL != x` both evaluate to NULL (filtered out), so every unassigned lead
 * would be excluded and the "available" count would collapse to 0.
 */
function baseUnassignedQuery(
  adminClient: SupabaseClient,
) {
  return adminClient
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null);
}

// ---------------------------------------------------------------------------
// Partner Loads
// ---------------------------------------------------------------------------

/**
 * Fetch current lead counts and names for multiple partners.
 * Returns one query for partner info + one grouped count query.
 */
export async function fetchPartnerLoads(
  adminClient: SupabaseClient,
  partnerIds: string[],
): Promise<PartnerLoadInfo[]> {
  if (partnerIds.length === 0) return [];

  // Fetch partner info + profile names
  const { data: partners } = await adminClient
    .from("partners")
    .select("id, company_id, status, profiles!inner(full_name)")
    .in("id", partnerIds);

  if (!partners) return [];

  // Fetch lead counts grouped by assigned_to
  const { data: counts } = await adminClient
    .from("leads")
    .select("assigned_to")
    .in("assigned_to", partnerIds);

  // Build count map
  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    const pid = row.assigned_to as string;
    countMap.set(pid, (countMap.get(pid) || 0) + 1);
  }

  return partners.map(
    (p: {
      id: string;
      company_id: string;
      profiles: unknown;
    }) => {
      const profiles = p.profiles as
        | { full_name: string }
        | { full_name: string }[]
        | null;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      return {
        partnerId: p.id,
        partnerName: profile?.full_name || p.company_id,
        companyId: p.company_id,
        currentLoad: countMap.get(p.id) || 0,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * Compute a full assignment preview without writing to DB.
 * Returns distribution, sample leads, and skip breakdown.
 */
export async function computePreview(
  adminClient: SupabaseClient,
  params: SmartAssignmentParams,
): Promise<AssignmentPreview> {
  const limit = Math.min(Math.max(1, params.limit), 10000);

  // 1. Fetch partner loads
  const partnerLoads = await fetchPartnerLoads(adminClient, params.partnerIds);

  // 2. Count available (unassigned leads matching the filters)
  let availableQuery = baseUnassignedQuery(adminClient);
  availableQuery = buildFilters(availableQuery, params.method, params);
  const { count: available } = await availableQuery;

  // 3. Count leads already assigned to any selected partner
  let assignedToCount = 0;
  for (const pid of params.partnerIds) {
    let pq = adminClient
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", pid);
    pq = buildFilters(pq, params.method, params);
    const { count } = await pq;
    assignedToCount += count || 0;
  }

  // 4. Count total matching (regardless of assignment)
  let totalQuery = adminClient
    .from("leads")
    .select("id", { count: "exact", head: true });
  totalQuery = buildFilters(totalQuery, params.method, params);
  const { count: totalMatching } = await totalQuery;

  // 5. Count unassigned matching leads missing the required field (company_name).
  //    Only the import-required field (company_name) counts as "missing data";
  //    optional fields like email must not flag otherwise-assignable leads.
  let missingQuery = adminClient
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null)
    .or("company_name.is.null,company_name.eq.");
  missingQuery = buildFilters(missingQuery, params.method, params);
  const { count: missingDataCount } = await missingQuery;

  // 6. Compute distribution
  const willAssign = Math.min(available || 0, limit);
  let distribution: DistributionEntry[];

  if (params.method === "auto_balance" && params.partnerIds.length >= 2) {
    // Auto-balance: distribute among partners
    const partnerLoadInputs: PartnerLoad[] = partnerLoads.map((pl) => ({
      partnerId: pl.partnerId,
      partnerName: pl.partnerName,
      currentLoad: pl.currentLoad,
    }));
    const result = computeAutoBalance(partnerLoadInputs, willAssign);
    distribution = result.entries;
  } else {
    // Other methods: equal share among selected partners
    const perPartner = Math.floor(willAssign / params.partnerIds.length);
    const remainder = willAssign % params.partnerIds.length;
    distribution = partnerLoads.map((pl, idx) => {
      const incoming = perPartner + (idx < remainder ? 1 : 0);
      return {
        partnerId: pl.partnerId,
        partnerName: pl.partnerName,
        currentLoad: pl.currentLoad,
        incoming,
        finalTotal: pl.currentLoad + incoming,
      };
    });
  }

  // 7. Skip breakdown
  const alreadyAssignedCount = assignedToCount;
  const missingData = missingDataCount || 0;
  const noMatch = Math.max(
    0,
    (totalMatching || 0) - (available || 0) - alreadyAssignedCount - missingData,
  );
  const skipped = (totalMatching || 0) - (available || 0) - alreadyAssignedCount;

  // 8. Sample leads (first 20)
  let sampleQuery = adminClient
    .from("leads")
    .select("id, company_name, country, status")
    .is("assigned_to", null)
    .order("created_at", { ascending: false })
    .limit(20);
  sampleQuery = buildFilters(sampleQuery, params.method, params);
  const { data: sampleData } = await sampleQuery;

  return {
    requested: limit,
    matching: totalMatching || 0,
    available: available || 0,
    willAssign,
    skipped: Math.max(0, skipped),
    partnerLoads,
    distribution,
    previewLeads: (sampleData || []).map(
      (l: Record<string, unknown>) => ({
        id: l.id as string,
        company_name: (l.company_name as string) || "—",
        country: (l.country as string) || "—",
        status: (l.status as string) || "not_contacted",
      }),
    ),
    skipBreakdown: {
      alreadyAssigned: alreadyAssignedCount,
      noMatch,
      missingData: missingData,
    },
  };
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

/**
 * Execute the assignment: distribute leads among selected partners.
 * Uses batch processing for large assignments (>1000 leads).
 */
export async function executeAssignment(
  adminClient: SupabaseClient,
  params: SmartAssignmentParams,
  onProgress?: (completed: number, total: number) => void,
): Promise<AssignmentResult> {
  const startTime = Date.now();
  const limit = Math.min(Math.max(1, params.limit), 10000);

  // 1. Compute distribution
  const partnerLoads = await fetchPartnerLoads(adminClient, params.partnerIds);

  let distribution: DistributionEntry[];
  if (params.method === "auto_balance" && params.partnerIds.length >= 2) {
    const partnerLoadInputs: PartnerLoad[] = partnerLoads.map((pl) => ({
      partnerId: pl.partnerId,
      partnerName: pl.partnerName,
      currentLoad: pl.currentLoad,
    }));
    const result = computeAutoBalance(partnerLoadInputs, limit);
    distribution = result.entries;
  } else {
    const perPartner = Math.floor(limit / params.partnerIds.length);
    const remainder = limit % params.partnerIds.length;
    distribution = partnerLoads.map((pl, idx) => {
      const incoming = perPartner + (idx < remainder ? 1 : 0);
      return {
        partnerId: pl.partnerId,
        partnerName: pl.partnerName,
        currentLoad: pl.currentLoad,
        incoming,
        finalTotal: pl.currentLoad + incoming,
      };
    });
  }

  // 2. For each partner, fetch leads and assign
  const partnerResults: PartnerAssignmentResult[] = [];
  let totalBatchCount = 0;
  let totalAssigned = 0;
  let totalSkipped = 0;

  for (const entry of distribution) {
    if (entry.incoming <= 0) {
      partnerResults.push({
        partnerId: entry.partnerId,
        partnerName: entry.partnerName,
        assigned: 0,
        skipped: 0,
      });
      continue;
    }

    // Fetch matching unassigned lead IDs
    let query = adminClient
      .from("leads")
      .select("id")
      .is("assigned_to", null)
      .order("id")
      .limit(entry.incoming);
    query = buildFilters(query, params.method, params);

    const { data: leadsToAssign } = await query;

    if (!leadsToAssign || leadsToAssign.length === 0) {
      partnerResults.push({
        partnerId: entry.partnerId,
        partnerName: entry.partnerName,
        assigned: 0,
        skipped: entry.incoming,
      });
      totalSkipped += entry.incoming;
      continue;
    }

    // Shuffle for random distribution
    const ids = shuffle(leadsToAssign.map((l: { id: string }) => l.id));

    // Batch update
    const BATCH_SIZE = 100;
    const now = new Date().toISOString();

    const batchResult = await processBatch({
      items: ids,
      batchSize: BATCH_SIZE,
      processor: async (batch) => {
        const { error } = await adminClient
          .from("leads")
          .update({ assigned_to: entry.partnerId, assigned_at: now })
          .in("id", batch);
        return {
          success: error ? 0 : batch.length,
          failed: error ? batch.length : 0,
        };
      },
      onProgress,
    });

    totalBatchCount += batchResult.batchCount;
    totalAssigned += batchResult.totalSuccess;
    totalSkipped += ids.length - batchResult.totalSuccess;

    partnerResults.push({
      partnerId: entry.partnerId,
      partnerName: entry.partnerName,
      assigned: batchResult.totalSuccess,
      skipped: entry.incoming - batchResult.totalSuccess,
    });
  }

  return {
    assigned: totalAssigned,
    skipped: totalSkipped,
    distribution: partnerResults,
    batchCount: totalBatchCount,
    duration: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// Filter Summary (for audit logging)
// ---------------------------------------------------------------------------

/**
 * Extract non-null filter values for audit logging.
 */
export function extractFilterSummary(
  params: SmartAssignmentParams,
): Record<string, string> {
  const filters: Record<string, string> = {};
  if (params.country) filters.country = params.country;
  if (params.state) filters.state = params.state;
  if (params.city) filters.city = params.city;
  if (params.industry) filters.industry = params.industry;
  if (params.status) filters.status = params.status;
  if (params.domain) filters.domain = params.domain;
  if (params.timeRange) filters.timeRange = params.timeRange;
  return filters;
}
