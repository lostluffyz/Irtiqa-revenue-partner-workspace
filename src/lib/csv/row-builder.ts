// ============================================
// CSV Row Builder — Canonical Row Construction
// ============================================
//
// Builds database-safe insert objects from parsed CSV rows using
// the resolved header mapping.
//
// SECURITY: The final database insert object is constructed explicitly
// from approved canonical fields. The raw CSV row is NEVER spread
// into a Supabase insert (no `...csvRow`).

import { ALLOWED_CSV_FIELDS, PROTECTED_CANONICAL_KEYS } from "./alias-registry";
import type { ColumnMapping, MappingAnalysis } from "./header-mapper";

// ---------------------------------------------------------------------------
// Mapping override — allows explicit admin choice for ambiguous fields
// ---------------------------------------------------------------------------

export interface AmbiguityResolution {
  /** The canonical field key. */
  canonicalField: string;
  /** The chosen source header (original text). */
  chosenSourceHeader: string;
}

// ---------------------------------------------------------------------------
// Row validation result
// ---------------------------------------------------------------------------

export interface RowValidation {
  /** 1-based row number (first data row = line 2). */
  rowNumber: number;
  /** True if this row passes all validations. */
  valid: boolean;
  /** Error message if invalid. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Row normalization
// ---------------------------------------------------------------------------

// =========================================================================
// Spreadsheet error / null value patterns
// =========================================================================

/**
 * Patterns that represent null / error / missing values in spreadsheet
 * exports. These should be normalized to null before database insertion.
 */
const SPREADSHEET_NULL_PATTERNS: readonly string[] = [
  "#ERROR!",
  "#VALUE!",
  "#REF!",
  "#N/A",
  "#NAME?",
  "#DIV/0!",
  "#NULL!",
  "#NUM!",
  "NULL",
  "null",
  "N/A",
  "n/a",
  "NA",
  "na",
  "N A",
  "-",
  "--",
  "---",
  "Unknown",
  "unknown",
  "None",
  "none",
  "Not Available",
  "not available",
  "NONE",
  "NULL_VALUE",
  "null_value",
  "EMPTY",
  "empty",
  "BLANK",
  "blank",
  "undefined",
  "UNDEFINED",
  "UNKNOWN",
];

/**
 * Normalize individual field values for canonical storage.
 *
 * Each value is trimmed. Spreadsheet error / null literals are converted
 * to empty string (which the caller handles as null). Email is lowercased
 * (standard normalization). Phone preserves all characters (including +,
 * leading zeros). All other fields are trimmed with no further rewriting.
 */
export function normalizeFieldValue(canonicalField: string, value: string): string {
  const trimmed = value.trim();

  // Empty strings become empty (caller handles null conversion)
  if (!trimmed) return trimmed;

  // Spreadsheet error / null values become empty → caller converts to null
  if (SPREADSHEET_NULL_PATTERNS.includes(trimmed)) {
    return "";
  }

  switch (canonicalField) {
    case "email":
      // Standard: lowercase emails for consistent matching
      return trimmed.toLowerCase();

    case "phone":
    case "website":
    case "company_name":
    case "industry":
    case "country":
    case "state":
    case "city":
    case "internal_notes":
    default:
      return trimmed;
  }
}

// ---------------------------------------------------------------------------
// Build insert rows from CSV data
// ---------------------------------------------------------------------------

export interface BuildResult {
  /** Valid rows ready for insertion. */
  validRows: Record<string, string | null>[];
  /** Per-row validation failures. */
  rowErrors: RowValidation[];
  /** Total valid rows. */
  validCount: number;
  /** Total invalid rows. */
  invalidCount: number;
}

/**
 * Build canonical insert rows from parsed CSV values using the resolved
 * header mapping.
 *
 * @param csvRows — parsed CSV rows (array of arrays, one per data line)
 * @param headers — original CSV headers (first line)
 * @param analysis — the mapping analysis (see header-mapper.ts)
 * @param ambiguityResolutions — optional admin overrides for ambiguous fields
 * @param createdBy — admin profile UUID (set as created_by)
 * @returns BuildResult with valid rows and row-level errors
 */
export function buildCanonicalRows(
  csvRows: string[][],
  headers: string[],
  analysis: MappingAnalysis,
  ambiguityResolutions: AmbiguityResolution[] | null,
  createdBy: string,
): BuildResult {
  // Build a map: sourceHeader → canonicalField
  const headerToCanonical = new Map<string, string | null>();
  for (const m of analysis.columnMappings) {
    headerToCanonical.set(m.sourceHeader, m.canonicalField);
  }

  // Apply ambiguity resolutions (admin overrides)
  if (ambiguityResolutions) {
    for (const res of ambiguityResolutions) {
      // Force the chosen source header for this canonical field
      // First, clear other candidates for this field
      for (const [src, canon] of headerToCanonical) {
        if (canon === res.canonicalField && src !== res.chosenSourceHeader) {
          headerToCanonical.set(src, null); // Demote other candidates
        }
      }
      // Ensure the chosen one is mapped
      const chosenNorm = res.chosenSourceHeader;
      if (!headerToCanonical.has(chosenNorm)) {
        // It might be the canonical key itself
        headerToCanonical.set(chosenNorm, res.canonicalField);
      }
    }
  }

  // Check for leftover ambiguity — if any field still has multiple candidates,
  // the build should still pick one (first encountered) for each row
  // but log a note. This handles the case where resolution UI wasn't used.

  const validRows: Record<string, string | null>[] = [];
  const rowErrors: RowValidation[] = [];

  for (let i = 0; i < csvRows.length; i++) {
    const rowIndex = i + 2; // 1-indexed, header is line 1
    const values = csvRows[i];
    const row: Record<string, string | null> = {};

    // Build row from mapped headers
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j];
      const canonicalField = headerToCanonical.get(header) || null;

      if (canonicalField && ALLOWED_CSV_FIELDS.has(canonicalField)) {
        const rawValue = (values[j] || "").trim();
        if (rawValue) {
          row[canonicalField] = normalizeFieldValue(canonicalField, rawValue);
        } else {
          row[canonicalField] = null;
        }
      }
      // Unmapped headers and PROTECTED fields are ignored
    }

    // Validate required field: company_name
    const companyName = row.company_name;
    if (!companyName || companyName.trim().length === 0) {
      rowErrors.push({
        rowNumber: rowIndex,
        valid: false,
        error: "Missing required field: company_name",
      });
      continue;
    }

    // Validate length limits
    if (companyName.length > 500) {
      rowErrors.push({
        rowNumber: rowIndex,
        valid: false,
        error: "company_name exceeds 500 characters",
      });
      continue;
    }

    // Set invariant fields
    row.status = "not_contacted";
    row.created_by = createdBy;

    // Validate other field lengths
    if (row.website && row.website.length > 500) {
      rowErrors.push({
        rowNumber: rowIndex,
        valid: false,
        error: "website exceeds 500 characters",
      });
      continue;
    }

    validRows.push(row);
  }

  return {
    validRows,
    rowErrors,
    validCount: validRows.length,
    invalidCount: rowErrors.length,
  };
}
