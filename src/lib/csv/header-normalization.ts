// ============================================
// CSV Header Normalization
// ============================================
//
// Deterministic normalization of CSV column headers for
// case-insensitive, punctuation-tolerant comparison.
//
// Preserves the original header for admin-facing display
// while producing a normalized form for matching.

/**
 * Normalize a header string for comparison.
 *
 * Steps (in order):
 *  1. Trim surrounding whitespace
 *  2. Replace underscores, hyphens, and repeated whitespace with a single space
 *  3. Trim again (in case step 2 introduced leading/trailing space)
 *  4. Lowercase
 *  5. Normalize Unicode (NFKC) — collapses visually similar chars
 *
 * Examples:
 *   " Company Name "   → "company name"
 *   "company_name"      → "company name"
 *   "COMPANY-NAME"      → "company name"
 *   "Company   Name"   → "company name"
 *   "Business_Email "   → "business email"
 */
export function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .replace(/[_\-]+/g, " ")          // underscores and hyphens → space
    .replace(/\s+/g, " ")            // collapse whitespace runs
    .trim()
    .toLowerCase()
    .normalize("NFKC");
}

/**
 * Return both the original header and its normalized form.
 */
export interface NormalizedHeader {
  original: string;
  normalized: string;
}

export function normalizeHeaders(raw: string[]): NormalizedHeader[] {
  return raw.map((h) => ({ original: h, normalized: normalizeHeader(h) }));
}
