// ============================================
// CSV Import Engine
// ============================================
//
// Orchestrates the full adaptive CSV import flow:
//
//   CSV text → parse → analyze headers → map → build rows → batch insert
//
// Authorization is handled by the caller (server action).
// The engine operates on already-parsed text and verified admin context.

import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeHeaders, resolveColumnTypes, type MappingAnalysis, type MatchTier } from "./header-mapper";
import { buildCanonicalRows, normalizeFieldValue, type AmbiguityResolution, type RowValidation } from "./row-builder";
import { CANONICAL_MAP } from "./alias-registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvPreview {
  /** Detected delimiter (always comma for now). */
  delimiter: string;
  /** Total lines detected (including header). */
  totalLines: number;
  /** Data rows (first 5 for preview, null if none). */
  previewRows: string[][] | null;
  /** The raw headers from the first line. */
  rawHeaders: string[];
  /** The deeply parsed header mapping analysis. */
  mappingAnalysis: MappingAnalysis;
}

// ---------------------------------------------------------------------------
// Data quality and provider detection types
// ---------------------------------------------------------------------------

export interface FieldQuality {
  /** The canonical field key. */
  canonicalField: string;
  /** Human-readable label. */
  label: string;
  /** Number of rows with a non-empty value for this field. */
  populated: number;
  /** Total data rows. */
  total: number;
  /** Percentage populated (0-100). */
  percentage: number;
}

export interface ProviderDetection {
  /** Human-readable provider name (e.g. "Google Maps", "Apify", "Unknown"). */
  name: string;
  /** Confidence percentage (0-100). */
  confidence: number;
}

export interface FieldConfidence {
  /** The canonical field key. */
  canonicalField: string;
  /** The source header this was mapped from. */
  sourceHeader: string;
  /** The match tier. */
  matchTier: MatchTier;
  /** Numeric confidence percentage (exact_canonical=100, exact_alias=85, unresolved=0). */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Extended import types
// ---------------------------------------------------------------------------

export interface ImportResult {
  success: boolean;
  /** Total data rows detected in the CSV (excluding header). */
  rowsDetected: number;
  /** Number of valid rows that were attempted. */
  rowsValid: number;
  /** Number of rows skipped due to validation errors. */
  rowsInvalid: number;
  /** Rows successfully inserted into the database. */
  rowsInserted: number;
  /** Rows that failed during batch insert. */
  rowsFailed: number;
  /** Per-row errors (first 50). */
  rowErrors: RowValidation[];
  /** Overall error message (file-level). */
  error?: string;
  /** Per-field extraction counts (how many rows had a value for each stored field). */
  fieldExtraction: Record<string, number>;
  /** Number of ignored/unmapped columns. */
  ignoredFieldCount: number;
  /** Elapsed time in milliseconds. */
  elapsedMs: number;
}

export interface ImportAnalysis {
  /** True if the file is valid for import (no ambiguity, no missing required). */
  canProceed: boolean;
  /** The full mapping analysis. */
  mappingAnalysis: MappingAnalysis;
  /** File-level stats. */
  totalRows: number;
  /** First 5 data rows for preview display. */
  previewRows: string[][] | null;
  /** Raw CSV headers. */
  rawHeaders: string[];
  /** Number of required fields detected. */
  requiredFieldCount: number;
  /** Number of optional stored fields detected. */
  optionalFieldCount: number;
  /** Number of ignored/unmapped columns. */
  ignoredFieldCount: number;
  /** Per-field population quality (computed from all data rows). */
  fieldQuality: FieldQuality[];
  /** Per-field confidence scores. */
  fieldConfidence: FieldConfidence[];
  /** Likely provider/source of the CSV. */
  provider: ProviderDetection;
  /** Estimated import success percentage (rows with company_name / total). */
  estimatedSuccess: number;
}

// ---------------------------------------------------------------------------
// Utility: MatchTier → confidence percentage
// ---------------------------------------------------------------------------

/**
 * Convert a MatchTier to a human-readable confidence percentage.
 *
 * - exact_canonical: 100% — the header exactly matched a canonical key
 * - exact_alias: 85% — the header matched a known alias (some risk of wrong interpretation)
 * - unresolved: 0% — no match found
 */
export function matchTierToConfidence(tier: MatchTier): number {
  switch (tier) {
    case "exact_canonical": return 100;
    case "exact_alias": return 85;
    case "unresolved": return 0;
  }
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

/** Signature header patterns for known lead-generation providers. */
const PROVIDER_SIGNATURES: Record<string, string[][]> = {
  "Google Maps": [
    ["rating", "reviews", "latitude", "longitude", "plus_code"],
    ["google_maps_url", "maps_url", "place_url", "gmb_url"],
    ["total_score", "place id"],
  ],
  "Apify": [
    ["title", "sourceUrl", "linkedInUrl"],
    ["zipCode", "city", "state"],
  ],
  "Outscraper": [
    ["place_id", "google_id", "sic", "naics"],
    ["site", "full_address"],
  ],
  "Clay": [
    ["enriched", "person_linkedin_url", "company_linkedin_url"],
    ["person_name", "job_title", "job_company_name"],
  ],
  "Instant Data Scraper": [
    ["_id", "page_url", "scraped_at"],
    ["data_id", "data_name"],
  ],
  "Apollo": [
    ["first_name", "last_name", "person_linkedin_url"],
    ["company_linkedin_url", "company_website_url"],
    ["organization_name"],
    ["phone_numbers", "direct_phone"],
  ],
};

/**
 * Detect the likely provider/source of a CSV file by matching
 * header patterns against known provider signatures.
 *
 * Uses a scoring system: each matched header group adds weight.
 * The provider with the highest score is selected, with a minimum
 * threshold to avoid false positives.
 *
 * @param rawHeaders — the original CSV column headers
 * @returns ProviderDetection with name and confidence percentage
 */
export function detectProvider(rawHeaders: string[]): ProviderDetection {
  if (rawHeaders.length === 0) {
    return { name: "Unknown", confidence: 0 };
  }

  // Normalize headers: lowercase, remove underscores, hyphens, spaces
  const normalizedHeaders = new Set(
    rawHeaders.map((h) =>
      h.trim().toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, ""),
    ),
  );

  const scores: Record<string, { score: number; maxPossible: number }> = {};

  for (const [provider, groups] of Object.entries(PROVIDER_SIGNATURES)) {
    let score = 0;
    let maxPossible = 0;

    for (const group of groups) {
      maxPossible += group.length;
      for (const sig of group) {
        const sigNorm = sig.toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, "");
        if (normalizedHeaders.has(sigNorm)) {
          score++;
        }
      }
    }

    if (score > 0) {
      scores[provider] = { score, maxPossible };
    }
  }

  // Find provider with highest score
  let bestProvider = "Unknown";
  let bestScore = 0;
  let bestMax = 0;

  for (const [provider, { score, maxPossible }] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestMax = maxPossible;
      bestProvider = provider;
    }
  }

  // Minimum threshold: at least 2 signature matches
  if (bestScore < 2) {
    return { name: "Unknown", confidence: 0 };
  }

  // Confidence: how many of the top provider's total signature patterns matched
  const confidence = Math.round((bestScore / Math.max(bestMax, 1)) * 100);

  return { name: bestProvider, confidence: Math.min(confidence, 100) };
}

// ---------------------------------------------------------------------------
// Field quality computation
// ---------------------------------------------------------------------------

/**
 * Compute per-field population quality statistics.
 *
 * Examines ALL data rows (not just preview samples) and counts how many
 * rows have a non-empty value for each mapped field. Spreadsheet error
 * values (#N/A, NULL, etc.) are treated as empty.
 *
 * @param rows — all parsed CSV data rows
 * @param rawHeaders — original CSV headers
 * @param mappingAnalysis — the resolved mapping analysis
 * @returns array of FieldQuality entries for mapped fields
 */
export function computeFieldQuality(
  rows: string[][],
  rawHeaders: string[],
  mappingAnalysis: MappingAnalysis,
): FieldQuality[] {
  const result: FieldQuality[] = [];
  const total = rows.length;

  if (total === 0) return result;

  // Build header index lookup
  const headerToColIdx = new Map<string, number>();
  for (let i = 0; i < rawHeaders.length; i++) {
    headerToColIdx.set(rawHeaders[i], i);
  }

  // For each resolved field, count populated rows
  for (const resolution of mappingAnalysis.fieldResolutions) {
    if (!resolution.resolved || resolution.candidates.length === 0) continue;

    const mapping = resolution.candidates[0];
    const colIdx = headerToColIdx.get(mapping.sourceHeader);
    if (colIdx === undefined) continue;

    let populated = 0;
    for (const row of rows) {
      const rawValue = row[colIdx]?.trim() || "";
      if (!rawValue) continue;

      // Normalize to check spreadsheet error patterns
      const normalized = normalizeFieldValue(resolution.canonicalField, rawValue);
      if (normalized) {
        populated++;
      }
    }

    const def = CANONICAL_MAP.get(resolution.canonicalField);
    result.push({
      canonicalField: resolution.canonicalField,
      label: def?.label ?? resolution.canonicalField,
      populated,
      total,
      percentage: Math.round((populated / total) * 100),
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Field confidence computation
// ---------------------------------------------------------------------------

/**
 * Compute per-field confidence scores from the mapping analysis.
 *
 * @param mappingAnalysis — the resolved mapping analysis
 * @returns array of FieldConfidence entries
 */
export function computeFieldConfidence(
  mappingAnalysis: MappingAnalysis,
): FieldConfidence[] {
  const result: FieldConfidence[] = [];

  for (const resolution of mappingAnalysis.fieldResolutions) {
    if (!resolution.resolved || resolution.candidates.length === 0) continue;

    const mapping = resolution.candidates[0];
    result.push({
      canonicalField: resolution.canonicalField,
      sourceHeader: mapping.sourceHeader,
      matchTier: mapping.matchTier,
      confidence: matchTierToConfidence(mapping.matchTier),
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Estimate import success
// ---------------------------------------------------------------------------

/**
 * Estimate the percentage of rows that would successfully import.
 * Rows with a populated company_name are considered likely to succeed.
 *
 * @param rows — all parsed CSV data rows
 * @param rawHeaders — original CSV headers
 * @param mappingAnalysis — the resolved mapping analysis
 * @returns percentage (0-100)
 */
export function estimateImportSuccess(
  rows: string[][],
  rawHeaders: string[],
  mappingAnalysis: MappingAnalysis,
): number {
  if (rows.length === 0) return 0;

  // Find the column mapping for company_name
  const companyMapping = mappingAnalysis.columnMappings.find(
    (m) => m.canonicalField === "company_name",
  );
  if (!companyMapping) return 0;

  const colIdx = rawHeaders.indexOf(companyMapping.sourceHeader);
  if (colIdx < 0) return 0;

  let populated = 0;
  for (const row of rows) {
    const value = row[colIdx]?.trim() || "";
    if (value) {
      const normalized = normalizeFieldValue("company_name", value);
      if (normalized) populated++;
    }
  }

  return Math.round((populated / rows.length) * 100);
}

// ---------------------------------------------------------------------------
// CSV parsing (shared with existing server action)
// ---------------------------------------------------------------------------

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  // Strip surrounding quotes from values
  return result.map((v) => {
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1);
    }
    return v;
  });
}

// ---------------------------------------------------------------------------
// Full CSV text parsing (handles CRLF, blank trailing lines, etc.)
// ---------------------------------------------------------------------------

export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  // Normalize line endings (CRLF → LF)
  const normalized = text.replace(/\r\n/g, "\n");

  // Empty input → no headers
  if (normalized.length === 0) {
    return { headers: [], rows: [] };
  }

  // Split into lines, trim trailing empty lines
  const lines = normalized.split("\n");
  const nonEmpty = lines.filter((l, i) => {
    // Keep header line even if empty
    if (i === 0) return true;
    // Keep data lines even if empty (they might have commas)
    return true;
  });

  if (nonEmpty.length === 0) {
    return { headers: [], rows: [] };
  }

  // If the first line is empty/whitespace, there are no headers
  if (nonEmpty[0].trim().length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(nonEmpty[0]);

  // Filter out completely empty trailing lines (no content at all)
  const dataLines = nonEmpty.slice(1).filter((line) => line.trim().length > 0);

  const rows = dataLines.map((line) => parseCsvLine(line));

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Preview / analysis (no database writes)
// ---------------------------------------------------------------------------

/**
 * Analyze a CSV file for import readiness.
 * Does NOT write to the database. Use this for the preview step.
 */
export function analyzeCsvFile(
  text: string,
): ImportAnalysis {
  const { headers, rows } = parseCsvText(text);

  if (headers.length === 0) {
    return {
      canProceed: false,
      mappingAnalysis: {
        columnMappings: [],
        fieldResolutions: [],
        hasMissingRequired: true,
        missingRequired: ["company_name"],
        hasAmbiguity: false,
        ambiguousFields: [],
        resolvedFields: [],
        unmappedHeaders: [],
        unmappedCount: 0,
      },
      totalRows: 0,
      previewRows: null,
      rawHeaders: [],
      requiredFieldCount: 0,
      optionalFieldCount: 0,
      ignoredFieldCount: 0,
      fieldQuality: [],
      fieldConfidence: [],
      provider: { name: "Unknown", confidence: 0 },
      estimatedSuccess: 0,
    };
  }

  // Initial header-based mapping
  const initialAnalysis = analyzeHeaders(headers);

  // Run URL-aware analysis using first 5 rows as sample data
  const sampleRows = rows.length > 0 ? rows.slice(0, 5) : null;
  const mappingAnalysis = resolveColumnTypes(
    headers,
    initialAnalysis.columnMappings,
    sampleRows,
  );

  // Preview: first 5 rows
  const previewRows = rows.length > 0 ? rows.slice(0, 5) : null;

  const canProceed =
    !mappingAnalysis.hasMissingRequired &&
    !mappingAnalysis.hasAmbiguity;

  // Compute enriched analysis
  const fieldQuality = computeFieldQuality(rows, headers, mappingAnalysis);
  const fieldConfidence = computeFieldConfidence(mappingAnalysis);
  const provider = detectProvider(headers);
  const estimatedSuccess = estimateImportSuccess(rows, headers, mappingAnalysis);
  const storedResolved = mappingAnalysis.resolvedFields.filter(
    (f) => ["company_name", "website", "phone", "email", "industry", "country", "internal_notes"].includes(f),
  );
  const requiredDetected = mappingAnalysis.resolvedFields.filter(
    (f) => CANONICAL_MAP.get(f)?.required,
  ).length;

  return {
    canProceed,
    mappingAnalysis,
    totalRows: rows.length,
    previewRows,
    rawHeaders: headers,
    requiredFieldCount: requiredDetected,
    optionalFieldCount: storedResolved.length - requiredDetected,
    ignoredFieldCount: mappingAnalysis.unmappedCount,
    fieldQuality,
    fieldConfidence,
    provider,
    estimatedSuccess,
  };
}

// ---------------------------------------------------------------------------
// Import (executes inserts)
// ---------------------------------------------------------------------------

/**
 * Execute a full CSV import.
 *
 * @param text — raw CSV text
 * @param adminClient — Supabase admin client for insert
 * @param createdBy — admin profile UUID
 * @param ambiguityResolutions — optional admin overrides for ambiguous fields
 * @returns ImportResult with detailed counts
 */
export async function importCsv(
  text: string,
  adminClient: SupabaseClient,
  createdBy: string,
  ambiguityResolutions: AmbiguityResolution[] | null = null,
): Promise<ImportResult> {
  const startTime = performance.now();

  // 1. Parse
  const { headers, rows } = parseCsvText(text);

  if (headers.length === 0) {
    return {
      success: false,
      rowsDetected: 0,
      rowsValid: 0,
      rowsInvalid: 0,
      rowsInserted: 0,
      rowsFailed: 0,
      rowErrors: [],
      error: "CSV file has no headers",
      fieldExtraction: {},
      ignoredFieldCount: 0,
      elapsedMs: Math.round(performance.now() - startTime),
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      rowsDetected: 0,
      rowsValid: 0,
      rowsInvalid: 0,
      rowsInserted: 0,
      rowsFailed: 0,
      rowErrors: [],
      error: "CSV file has no data rows",
      fieldExtraction: {},
      ignoredFieldCount: 0,
      elapsedMs: Math.round(performance.now() - startTime),
    };
  }

  // 2. Analyze headers with URL-aware classification
  const initialAnalysis = analyzeHeaders(headers);
  const sampleRows = rows.slice(0, 10);
  const analysis = resolveColumnTypes(
    headers,
    initialAnalysis.columnMappings,
    sampleRows,
  );

  // 3. Check for missing required fields
  if (analysis.hasMissingRequired) {
    return {
      success: false,
      rowsDetected: rows.length,
      rowsValid: 0,
      rowsInvalid: 0,
      rowsInserted: 0,
      rowsFailed: 0,
      rowErrors: [],
      error: `Missing required column: ${analysis.missingRequired.join(", ")}. Unable to determine which column contains company names.`,
      fieldExtraction: {},
      ignoredFieldCount: analysis.unmappedCount,
      elapsedMs: Math.round(performance.now() - startTime),
    };
  }

  // 4. Check for ambiguity
  if (analysis.hasAmbiguity && !ambiguityResolutions) {
    return {
      success: false,
      rowsDetected: rows.length,
      rowsValid: 0,
      rowsInvalid: 0,
      rowsInserted: 0,
      rowsFailed: 0,
      rowErrors: [],
      error: `Ambiguous columns: ${analysis.ambiguousFields.join(", ")}. Multiple source columns map to the same field.`,
      fieldExtraction: {},
      ignoredFieldCount: analysis.unmappedCount,
      elapsedMs: Math.round(performance.now() - startTime),
    };
  }

  // 5. Build canonical rows
  const { validRows, rowErrors, validCount, invalidCount } = buildCanonicalRows(
    rows,
    headers,
    analysis,
    ambiguityResolutions,
    createdBy,
  );

  if (validCount === 0) {
    return {
      success: false,
      rowsDetected: rows.length,
      rowsValid: 0,
      rowsInvalid: invalidCount,
      rowsInserted: 0,
      rowsFailed: 0,
      rowErrors,
      error: "No valid rows to insert",
      fieldExtraction: {},
      ignoredFieldCount: analysis.unmappedCount,
      elapsedMs: Math.round(performance.now() - startTime),
    };
  }

  // 6. Batch insert (100 rows per batch)
  const BATCH_SIZE = 100;
  let inserted = 0;
  let failed = 0;
  const insertErrors: RowValidation[] = [];

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await adminClient
      .from("leads")
      .insert(batch);

    if (insertError) {
      failed += batch.length;
      insertErrors.push({
        rowNumber: 0,
        valid: false,
        error: `Batch insert error (rows ${i + 1}-${i + batch.length}): ${insertError.message}`,
      });
    } else {
      inserted += batch.length;
    }
  }

  // 7. Compute per-field extraction counts
  const fieldExtraction: Record<string, number> = {};
  for (const row of validRows) {
    for (const [field, value] of Object.entries(row)) {
      if (value !== null && value !== undefined && value.trim().length > 0) {
        fieldExtraction[field] = (fieldExtraction[field] || 0) + 1;
      }
    }
  }

  const allErrors = [...rowErrors, ...insertErrors];
  const elapsedMs = Math.round(performance.now() - startTime);

  return {
    success: inserted > 0,
    rowsDetected: rows.length,
    rowsValid: validCount,
    rowsInvalid: invalidCount,
    rowsInserted: inserted,
    rowsFailed: failed,
    rowErrors: allErrors.slice(0, 50), // Cap at 50
    fieldExtraction,
    ignoredFieldCount: analysis.unmappedCount,
    elapsedMs,
  };
}
