"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, assignLeads, logAdminActivity } from "@/lib/admin";
import { analyzeCsvFile, importCsv, parseCsvText } from "@/lib/csv/import-engine";
import type { ImportAnalysis } from "@/lib/csv/import-engine";
import type { AmbiguityResolution } from "@/lib/csv/row-builder";
import {
  computePreview,
  executeAssignment,
  extractFilterSummary,
  type SmartAssignmentParams,
} from "@/lib/lead-assignment";

// Re-export for UI consumers
export type { SmartAssignmentParams } from "@/lib/lead-assignment";

// ============================================
// Lead Assignment Action (legacy single-partner)
// ============================================

export async function assignLeadsAction(
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();

  const leadIdsJson = formData.get("leadIds");
  const partnerId = formData.get("partnerId");

  if (typeof leadIdsJson !== "string" || typeof partnerId !== "string") {
    return { error: "Invalid input" };
  }

  let leadIds: string[];
  try {
    leadIds = JSON.parse(leadIdsJson);
  } catch {
    return { error: "Invalid lead IDs format" };
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return { error: "At least one lead must be selected" };
  }

  if (leadIds.length > 500) {
    return { error: "Maximum 500 leads per batch" };
  }

  const result = await assignLeads(leadIds, partnerId);
  revalidatePath("/admin/leads");
  return result;
}

// ============================================
// CSV Preview Action (analyze only, no writes)
// ============================================

export async function previewCsvAction(
  text: string,
): Promise<{ success: boolean; analysis?: ImportAnalysis; error?: string }> {
  try {
    await requireAdmin();
    const analysis = analyzeCsvFile(text);
    return { success: true, analysis };
  } catch (err) {
    console.error("CSV preview error:", err);
    return { success: false, error: "Failed to analyze CSV file" };
  }
}

// ============================================
// CSV Preview-Only Action (no analysis, fast header peek)
// ============================================

export async function previewCsvHeadersAction(
  text: string,
): Promise<{ success: boolean; headers?: string[]; error?: string }> {
  try {
    await requireAdmin();
    const firstLine = text.split("\n").find((l) => l.trim().length > 0);
    if (!firstLine) {
      return { success: false, error: "Empty CSV file" };
    }
    const headers = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return { success: true, headers };
  } catch (err) {
    return { success: false, error: "Failed to read CSV headers" };
  }
}

// ============================================
// Duplicate Detection Action
// ============================================

export interface DuplicateResult {
  newCount: number;
  duplicateCount: number;
  possibleCount: number;
  duplicates: Array<{ rowNumber: number; companyName: string; website: string | null; phone: string | null }>;
}

export async function checkDuplicatesAction(
  text: string,
): Promise<{ success: boolean; result?: DuplicateResult; error?: string }> {
  try {
    await requireAdmin();

    const analysis = analyzeCsvFile(text);
    if (!analysis.canProceed || !analysis.mappingAnalysis.columnMappings.length) {
      return { success: false, error: "Cannot check duplicates: CSV analysis failed" };
    }

    const headerToCanonical = new Map<string, string | null>();
    for (const m of analysis.mappingAnalysis.columnMappings) {
      headerToCanonical.set(m.sourceHeader, m.canonicalField);
    }

    const { rows } = parseCsvText(text);

    const websiteIdx = analysis.rawHeaders.findIndex(
      (h) => headerToCanonical.get(h) === "website",
    );
    const nameIdx = analysis.rawHeaders.findIndex(
      (h) => headerToCanonical.get(h) === "company_name",
    );
    const phoneIdx = analysis.rawHeaders.findIndex(
      (h) => headerToCanonical.get(h) === "phone",
    );

    const websites = new Set<string>();
    const names = new Set<string>();
    const phones = new Set<string>();
    const rowData: Array<{ rowNumber: number; companyName: string; website: string | null; phone: string | null }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const companyName = nameIdx >= 0 && row[nameIdx]?.trim() ? row[nameIdx].trim() : "";
      const website = websiteIdx >= 0 && row[websiteIdx]?.trim() ? row[websiteIdx].trim().toLowerCase() : "";
      const phone = phoneIdx >= 0 && row[phoneIdx]?.trim() ? row[phoneIdx].trim() : "";

      if (companyName) {
        names.add(companyName);
        if (website) websites.add(website);
        if (phone) phones.add(phone);
        rowData.push({
          rowNumber: i + 2,
          companyName,
          website: website || null,
          phone: phone || null,
        });
      }
    }

    if (names.size === 0) {
      return {
        success: true,
        result: { newCount: 0, duplicateCount: 0, possibleCount: 0, duplicates: [] },
      };
    }

    const { adminClient } = await import("@/lib/supabase/admin");

    let matchedByWebsite = new Set<string>();
    if (websites.size > 0) {
      const { data: websiteMatches } = await adminClient
        .from("leads")
        .select("company_name, website, phone")
        .in("website", Array.from(websites));

      if (websiteMatches) {
        for (const m of websiteMatches) {
          if (m.website) matchedByWebsite.add(m.website);
        }
      }
    }

    let matchedByName = new Set<string>();
    if (names.size > 0) {
      const { data: nameMatches } = await adminClient
        .from("leads")
        .select("company_name, website, phone")
        .in("company_name", Array.from(names));

      if (nameMatches) {
        for (const m of nameMatches) {
          if (m.company_name) matchedByName.add(m.company_name);
        }
      }
    }

    let matchedByPhone = new Set<string>();
    if (phones.size > 0) {
      const { data: phoneMatches } = await adminClient
        .from("leads")
        .select("company_name, website, phone")
        .in("phone", Array.from(phones));

      if (phoneMatches) {
        for (const m of phoneMatches) {
          if (m.phone) matchedByPhone.add(m.phone);
        }
      }
    }

    let newCount = 0;
    let duplicateCount = 0;
    let possibleCount = 0;
    const duplicates: Array<{ rowNumber: number; companyName: string; website: string | null; phone: string | null }> = [];

    for (const r of rowData) {
      const websiteMatch = r.website && matchedByWebsite.has(r.website);
      const nameMatch = matchedByName.has(r.companyName);
      const phoneMatch = r.phone && matchedByPhone.has(r.phone);

      if (websiteMatch) {
        duplicateCount++;
        duplicates.push(r);
      } else if (nameMatch && phoneMatch) {
        duplicateCount++;
        duplicates.push(r);
      } else if (nameMatch || phoneMatch) {
        possibleCount++;
      } else {
        newCount++;
      }
    }

    return {
      success: true,
      result: {
        newCount,
        duplicateCount,
        possibleCount,
        duplicates,
      },
    };
  } catch (err) {
    console.error("Duplicate check error:", err);
    return { success: false, error: "Failed to check for duplicates" };
  }
}

// ============================================
// CSV Import Action (executes inserts)
// ============================================

export interface ImportActionResult {
  success?: boolean;
  error?: string;
  inserted?: number;
  errors?: string[];
  fieldCounts?: Record<string, number>;
  elapsedMs?: number;
}

export async function uploadCsvAction(
  prev: ImportActionResult | null,
  formData: FormData,
): Promise<ImportActionResult> {
  try {
    const { profile } = await requireAdmin();

    const file = formData.get("csvFile") as File | null;
    if (!file) {
      return { error: "No file provided" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { error: "File too large. Maximum 5MB." };
    }

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return { error: "Only CSV files are accepted." };
    }

    const text = await file.text();

    const lineCount = text.split("\n").filter(Boolean).length;
    if (lineCount > 5001) {
      return { error: "Maximum 5000 rows per upload." };
    }

    const resolutionsJson = formData.get("ambiguityResolutions");
    let resolutions: AmbiguityResolution[] | null = null;
    if (typeof resolutionsJson === "string") {
      try {
        resolutions = JSON.parse(resolutionsJson);
        if (!Array.isArray(resolutions)) resolutions = null;
      } catch {
        resolutions = null;
      }
    }

    const adminClient = (await import("@/lib/supabase/admin")).adminClient;
    const result = await importCsv(text, adminClient, profile.id, resolutions);

    return {
      success: result.success,
      inserted: result.rowsInserted,
      error: result.error,
      errors: result.rowErrors.length > 0
        ? result.rowErrors.map((r) => `Row ${r.rowNumber}: ${r.error}`)
        : undefined,
      fieldCounts: result.fieldExtraction,
      elapsedMs: result.elapsedMs,
    };
  } catch (err) {
    console.error("CSV upload error:", err);
    return { error: "Failed to process CSV file" };
  }
}

// ============================================
// Lead Status Update Action
// ============================================

export async function updateLeadStatusAction(
  leadId: string,
  newStatus: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      console.error("Failed to update lead status:", error.message);
      return { error: "Failed to update status" };
    }

    revalidatePath("/admin/leads");
    return { success: true };
  } catch (err) {
    console.error("Lead status update error:", err);
    return { error: "Failed to update status" };
  }
}

// ============================================
// Smart Lead Assignment — Preview (thin wrapper)
// ============================================

export async function previewSmartAssignmentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; preview?: Awaited<ReturnType<typeof computePreview>>; error?: string }> {
  try {
    const { adminClient } = await import("@/lib/supabase/admin");
    await requireAdmin();

    const paramsJson = formData.get("params");
    if (typeof paramsJson !== "string") {
      return { success: false, error: "Invalid parameters" };
    }

    const params: SmartAssignmentParams = JSON.parse(paramsJson);
    if (!params.partnerIds?.length || !params.method || !params.limit) {
      return { success: false, error: "Missing required fields" };
    }

    const preview = await computePreview(adminClient, params);
    return { success: true, preview };
  } catch (err) {
    console.error("Smart assignment preview error:", err);
    return { success: false, error: "Failed to preview assignment" };
  }
}

// ============================================
// Smart Lead Assignment — Execute (thin wrapper)
// ============================================

export async function executeSmartAssignmentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{
  success: boolean;
  assigned?: number;
  skipped?: number;
  distribution?: { partnerId: string; partnerName: string; assigned: number; skipped: number }[];
  method?: string;
  totalBatches?: number;
  duration?: number;
  error?: string;
}> {
  try {
    const { adminClient } = await import("@/lib/supabase/admin");
    const { profile } = await requireAdmin();

    const paramsJson = formData.get("params");
    if (typeof paramsJson !== "string") {
      return { success: false, error: "Invalid parameters" };
    }

    const params: SmartAssignmentParams = JSON.parse(paramsJson);
    if (!params.partnerIds?.length || !params.method || !params.limit) {
      return { success: false, error: "Missing required fields" };
    }

    // Validate all partners are active
    const { data: partners } = await adminClient
      .from("partners")
      .select("id, status")
      .in("id", params.partnerIds);

    if (!partners || partners.length !== params.partnerIds.length) {
      return { success: false, error: "One or more partners not found" };
    }

    const inactivePartners = partners.filter(
      (p: { status: string }) => p.status !== "active",
    );
    if (inactivePartners.length > 0) {
      return { success: false, error: "One or more selected partners is not active" };
    }

    // Execute assignment via service layer
    const result = await executeAssignment(adminClient, params);

    // Comprehensive audit logging
    await logAdminActivity(await createClient(), "smart_leads_assigned", {
      partners: result.distribution.map((d) => ({
        partnerId: d.partnerId,
        partnerName: d.partnerName,
        assigned: d.assigned,
        skipped: d.skipped > 0 ? d.skipped : null,
      })),
      method: params.method,
      filters: extractFilterSummary(params),
      totalAssigned: result.assigned,
      totalRequested: params.limit,
      batchCount: result.batchCount,
      duration: result.duration,
      adminId: profile.id,
    });

    revalidatePath("/admin/leads");

    return {
      success: true,
      assigned: result.assigned,
      skipped: result.skipped,
      distribution: result.distribution,
      method: params.method,
      totalBatches: result.batchCount,
      duration: result.duration,
    };
  } catch (err) {
    console.error("Smart assignment error:", err);
    return { success: false, error: "Failed to execute assignment" };
  }
}

// ============================================
// Smart Lead Assignment — Distinct Field Values
// ============================================================================

export async function getDistinctFieldAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; values?: string[]; error?: string }> {
  try {
    const { adminClient } = await import("@/lib/supabase/admin");
    await requireAdmin();

    const field = formData.get("field");
    if (typeof field !== "string") {
      return { success: false, error: "Invalid field" };
    }

    if (field === "website") {
      const { data, error } = await adminClient
        .from("leads")
        .select("website")
        .not("website", "is", null)
        .not("website", "eq", "");

      if (error) {
        return { success: false, error: "Failed to fetch websites" };
      }

      const domains = new Set<string>();
      for (const row of data || []) {
        if (row.website) {
          try {
            const url = row.website.startsWith("http") ? row.website : `https://${row.website}`;
            const hostname = new URL(url).hostname.replace(/^www\./, "");
            if (hostname) domains.add(hostname);
          } catch {
            const raw = row.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
            if (raw) domains.add(raw);
          }
        }
      }

      return { success: true, values: Array.from(domains).sort() };
    }

    const allowedFields = ["country", "state", "city", "industry"];
    if (!allowedFields.includes(field)) {
      return { success: false, error: "Invalid field" };
    }

    const { data, error } = await adminClient
      .from("leads")
      .select(field)
      .not(field, "is", null)
      .not(field, "eq", "");

    if (error) {
      return { success: false, error: "Failed to fetch values" };
    }

    const unique = new Set<string>();
    for (const row of data || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (row as any)[field] as string | null;
      if (val && val.trim()) unique.add(val.trim());
    }

    return { success: true, values: Array.from(unique).sort() };
  } catch (err) {
    console.error("Distinct field error:", err);
    return { success: false, error: "Failed to fetch field values" };
  }
}
