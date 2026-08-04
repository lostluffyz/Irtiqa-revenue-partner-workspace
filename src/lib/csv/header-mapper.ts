// ============================================
// CSV Header Mapper — Deterministic Mapping Engine
// ============================================
//
// Maps CSV column headers to canonical lead fields using
// a hierarchical evidence model:
//
//  1. Exact canonical match    — the normalized header IS the canonical key
//  2. Exact normalized alias   — found in the alias registry
//  3. Unresolved               — no match found
//
// Every mapping result retains the source header, normalized form,
// canonical target (if resolved), match reason, and confidence tier.
//
// Ambiguity detection: if two (or more) source columns map to the same
// canonical field, the mapping is flagged as ambiguous IF all candidates
// have the same match tier. If tiers differ, the highest-confidence mapping
// is selected automatically (e.g., exact_canonical beats exact_alias).

import { normalizeHeader } from "./header-normalization";
import { ALIAS_TO_CANONICAL, CANONICAL_MAP, ALLOWED_CSV_FIELDS } from "./alias-registry";
import { classifyUrlColumns } from "./url-classifier";

// ---------------------------------------------------------------------------
// Constants — all canonical keys for matching
// ---------------------------------------------------------------------------

/** All canonical field keys (both stored and recognition-only). */
const ALL_CANONICAL_KEYS: ReadonlySet<string> = new Set(CANONICAL_MAP.keys());

// Reverse map: normalized canonical field name → actual canonical key
// e.g., "company name" → "company_name", "city" → "city"
const NORMALIZED_TO_CANONICAL: ReadonlyMap<string, string> = new Map(
  Array.from(ALL_CANONICAL_KEYS).map((f) => [normalizeHeader(f), f]),
);

// ---------------------------------------------------------------------------
// Mapping result types
// ---------------------------------------------------------------------------

export type MatchTier =
  | "exact_canonical"  // Header matched the canonical key exactly (after normalization)
  | "exact_alias"      // Header matched a known alias
  | "unresolved";      // No match found

/**
 * Numeric ordering for auto-resolution. Higher number = higher confidence.
 */
const TIER_ORDER: Record<MatchTier, number> = {
  exact_canonical: 3,
  exact_alias: 2,
  unresolved: 1,
};

export interface ColumnMapping {
  /** The source (original) CSV header text. */
  sourceHeader: string;
  /** Normalized form of the source header. */
  normalizedHeader: string;
  /** The canonical field this maps to (null if unresolved). */
  canonicalField: string | null;
  /** Why this mapping was chosen. */
  matchReason: string;
  /** How confident the match is. */
  matchTier: MatchTier;
}

// ---------------------------------------------------------------------------
// Per-field resolution tracking
// ---------------------------------------------------------------------------

export interface FieldCandidates {
  /** Canonical field key. */
  canonicalField: string;
  /** Display label. */
  label: string;
  /** Whether this field is required. */
  required: boolean;
  /** Source columns that could supply this field. */
  candidates: ColumnMapping[];
  /** True if exactly one mapping resolved. */
  resolved: boolean;
  /** True if multiple source columns compete for this field. */
  ambiguous: boolean;
}

// ---------------------------------------------------------------------------
// Full analysis result
// ---------------------------------------------------------------------------

export interface MappingAnalysis {
  /** Per-column mappings (one per CSV header). */
  columnMappings: ColumnMapping[];
  /** Aggregated per-field resolution status. */
  fieldResolutions: FieldCandidates[];
  /** True if any required canonical field has no resolution. */
  hasMissingRequired: boolean;
  /** Missing required canonical field keys. */
  missingRequired: string[];
  /** True if any canonical field has multiple competing source columns. */
  hasAmbiguity: boolean;
  /** Canonical field keys that are ambiguous. */
  ambiguousFields: string[];
  /** Mapped canonical field keys (resolved uniquely). */
  resolvedFields: string[];
  /** Unresolved source headers (no canonical match). */
  unmappedHeaders: string[];
  /** Total unmapped (supplemental) column count. */
  unmappedCount: number;
}

// ---------------------------------------------------------------------------
// Deterministic mapping
// ---------------------------------------------------------------------------

/**
 * Map a single normalized header to a canonical field.
 *
 * Priority:
 *  1. If normalized header is exactly a canonical key → exact_canonical
 *  2. If normalized header is in the alias registry → exact_alias
 *  3. Otherwise → unresolved
 */
export function mapHeader(
  sourceHeader: string,
): ColumnMapping {
  const normalized = normalizeHeader(sourceHeader);

  // Priority 1: exact canonical key match
  // Check both the raw canonical key and the normalized form of the canonical key
  // so that "company_name" → normalized "company name" still matches "company_name"
  if (ALLOWED_CSV_FIELDS.has(normalized) || ALL_CANONICAL_KEYS.has(normalized)) {
    return {
      sourceHeader,
      normalizedHeader: normalized,
      canonicalField: normalized,
      matchReason: "Header matches canonical field name",
      matchTier: "exact_canonical",
    };
  }

  // Check if the normalized form matches a normalized canonical field name
  // (e.g., normalized "company name" → canonical "company_name")
  const normalizedMatch = NORMALIZED_TO_CANONICAL.get(normalized);
  if (normalizedMatch) {
    return {
      sourceHeader,
      normalizedHeader: normalized,
      canonicalField: normalizedMatch,
      matchReason: "Header matches canonical field name",
      matchTier: "exact_canonical",
    };
  }

  // Priority 2: known alias match
  const aliasMatch = ALIAS_TO_CANONICAL.get(normalized);
  if (aliasMatch) {
    return {
      sourceHeader,
      normalizedHeader: normalized,
      canonicalField: aliasMatch,
      matchReason: `Matched alias → ${aliasMatch}`,
      matchTier: "exact_alias",
    };
  }

  // Priority 3: unresolved
  return {
    sourceHeader,
    normalizedHeader: normalized,
    canonicalField: null,
    matchReason: "Unknown header — no matching canonical field",
    matchTier: "unresolved",
  };
}

// ---------------------------------------------------------------------------
// Confidence-based auto-resolution
// ---------------------------------------------------------------------------

/**
 * Tier ordering for confidence.
 */
export function tierScore(tier: MatchTier): number {
  return TIER_ORDER[tier];
}

/**
 * Resolve ambiguous field groups by confidence tier.
 *
 * When multiple columns map to the same canonical field, this filters
 * down to only the highest-confidence candidates. If only one remains
 * after filtering, it's considered resolved. If multiple remain at the
 * same tier, they're truly ambiguous.
 *
 * Examples:
 *   - company_name (exact_canonical) + Business (exact_alias)
 *     → keep company_name only → resolved
 *   - Company (exact_alias) + Business (exact_alias)
 *     → both same tier → ambiguous
 */
function resolveByHighestConfidence(candidates: ColumnMapping[]): ColumnMapping[] {
  if (candidates.length <= 1) return candidates;

  const highestTier = candidates.reduce(
    (best, c) => Math.max(best, TIER_ORDER[c.matchTier]),
    TIER_ORDER.unresolved,
  );

  return candidates.filter((c) => TIER_ORDER[c.matchTier] === highestTier);
}

// ---------------------------------------------------------------------------
// Build analysis from column mappings
// ---------------------------------------------------------------------------

/**
 * Build a full MappingAnalysis from a set of column mappings.
 *
 * Extracted from analyzeHeaders so it can be reused with adjusted
 * column mappings (e.g., after URL classification or other data-aware
 * post-processing).
 */
export function buildAnalysisFromMappings(
  columnMappings: ColumnMapping[],
): MappingAnalysis {
  // 1. Group resolved mappings by canonical field
  const fieldGroups = new Map<string, ColumnMapping[]>();
  for (const m of columnMappings) {
    if (m.canonicalField) {
      const existing = fieldGroups.get(m.canonicalField) || [];
      existing.push(m);
      fieldGroups.set(m.canonicalField, existing);
    }
  }

  // 2. Build per-field resolution status with confidence-based auto-resolution
  const fieldResolutions: FieldCandidates[] = [];
  const ambiguousFields: string[] = [];
  const resolvedFields: string[] = [];
  const unmappedHeaders: string[] = [];
  const missingRequired: string[] = [];

  for (const [field, allCandidates] of fieldGroups) {
    // Apply confidence-based auto-resolution
    const candidates = resolveByHighestConfidence(allCandidates);

    const def = CANONICAL_MAP.get(field);
    const f: FieldCandidates = {
      canonicalField: field,
      label: def?.label ?? field,
      required: def?.required ?? false,
      candidates,
      resolved: candidates.length === 1,
      ambiguous: candidates.length > 1,
    };
    fieldResolutions.push(f);

    if (candidates.length > 1) {
      ambiguousFields.push(field);
    }
    if (candidates.length === 1) {
      resolvedFields.push(field);
    }
  }

  // 3. Check missing required fields
  // A required field is "missing" only if it has ZERO candidates.
  // Fields with multiple candidates remain ambiguous (handled separately).
  // Use the FULL candidate list (before resolution) for this check.
  for (const def of CANONICAL_MAP.values()) {
    if (def.required) {
      const existing = fieldGroups.get(def.canonical);
      if (!existing || existing.length === 0) {
        missingRequired.push(def.canonical);
      }
    }
  }

  // 4. Collect unmapped headers
  for (const m of columnMappings) {
    if (!m.canonicalField) {
      unmappedHeaders.push(m.sourceHeader);
    }
  }

  return {
    columnMappings,
    fieldResolutions,
    hasMissingRequired: missingRequired.length > 0,
    missingRequired,
    hasAmbiguity: ambiguousFields.length > 0,
    ambiguousFields,
    resolvedFields,
    unmappedHeaders,
    unmappedCount: unmappedHeaders.length,
  };
}

// ---------------------------------------------------------------------------
// Data-aware column type resolution
// ---------------------------------------------------------------------------

/**
 * Apply data-aware column type resolution using sample row values.
 *
 * This post-processing step runs after initial header mapping and:
 *  1. Reclassifies URL columns by inspecting their actual values
 *     (e.g., a column with "https://maps.google.com/..." links gets
 *      classified as google_maps_url instead of website)
 *  2. Rebuilds the full MappingAnalysis from the adjusted mappings
 *
 * The URL classification uses the url-classifier module, which examines
 * the first N data rows (sample) to determine the dominant URL pattern.
 *
 * @param rawHeaders — original CSV headers
 * @param columnMappings — initial column mappings from mapHeader
 * @param sampleRows — first N data rows for value sampling (null if unavailable)
 * @returns updated MappingAnalysis with data-aware resolutions applied
 */
export function resolveColumnTypes(
  rawHeaders: string[],
  columnMappings: ColumnMapping[],
  sampleRows: string[][] | null,
): MappingAnalysis {
  if (!sampleRows || sampleRows.length === 0) {
    return buildAnalysisFromMappings(columnMappings);
  }

  // --- Step 1: Identify columns for URL classification ---

  const websiteAliasIndices: number[] = [];
  const unresolvedIndices: number[] = [];

  for (let i = 0; i < columnMappings.length; i++) {
    const m = columnMappings[i];
    if (m.canonicalField === "website" && m.matchTier === "exact_alias") {
      websiteAliasIndices.push(i);
    } else if (!m.canonicalField) {
      unresolvedIndices.push(i);
    }
  }

  // --- Step 2: Run URL classification ---

  const urlResolutions = classifyUrlColumns(
    rawHeaders,
    sampleRows,
    websiteAliasIndices,
    unresolvedIndices,
  );

  if (urlResolutions.size === 0) {
    return buildAnalysisFromMappings(columnMappings);
  }

  // --- Step 3: Apply URL reclassifications ---

  const adjustedMappings = columnMappings.map((m, i) => {
    const resolvedField = urlResolutions.get(i);
    if (resolvedField) {
      return {
        ...m,
        canonicalField: resolvedField,
        matchReason: `Reclassified from ${m.canonicalField || "unresolved"} → ${resolvedField} (URL analysis)`,
        matchTier: m.canonicalField ? "exact_alias" as const : "exact_alias" as const,
      };
    }
    return m;
  });

  // --- Step 4: Rebuild full analysis from adjusted mappings ---

  return buildAnalysisFromMappings(adjustedMappings);
}

// ---------------------------------------------------------------------------
// Aggregate analysis (header-only, no data)
// ---------------------------------------------------------------------------

/**
 * Analyze all CSV headers and produce a structured mapping analysis.
 *
 * Uses header-based matching only (no data sampling). For data-aware
 * analysis with URL classification, use resolveColumnTypes() instead.
 *
 * @param rawHeaders — the original CSV column headers (first row values).
 * @returns MappingAnalysis with per-column, per-field, and aggregate info.
 */
export function analyzeHeaders(rawHeaders: string[]): MappingAnalysis {
  const columnMappings = rawHeaders.map(mapHeader);
  return buildAnalysisFromMappings(columnMappings);
}
