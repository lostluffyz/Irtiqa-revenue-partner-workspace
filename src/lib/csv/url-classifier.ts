// ============================================
// CSV URL Classifier — Value-Based URL Classification
// ============================================
//
// Classifies URL values by inspecting the URL domain and path,
// not the column header. This enables automatic disambiguation
// of columns like "url" (which could be a website, Google Maps link,
// LinkedIn profile, etc.) without administrator intervention.
//
// URL classification is value-driven: the actual URL data in the
// column is sampled and the dominant pattern determines the type.
//
// Classification priority:
//  1. Google Maps (maps.google.com, goo.gl/maps, google.com/maps/…)
//  2. LinkedIn (linkedin.com/company, linkedin.com/in)
//  3. Facebook (facebook.com, fb.com)
//  4. Generic website (catch-all for valid URLs)
//  5. Non-URL / empty → "unknown"
//
// Security: URL classification uses pattern matching only.
// No network requests are made. No external APIs are called.

// ---------------------------------------------------------------------------
// URL type constants (correspond to canonical field keys)
// ---------------------------------------------------------------------------

export const URL_TYPE_WEBSITE = "website";
export const URL_TYPE_GOOGLE_MAPS = "google_maps_url";
export const URL_TYPE_LINKEDIN = "linkedin_url";
export const URL_TYPE_FACEBOOK = "facebook_url";
export const URL_TYPE_SOURCE = "source_url";
export const URL_TYPE_UNKNOWN = "unknown";

export type UrlClassification =
  | typeof URL_TYPE_WEBSITE
  | typeof URL_TYPE_GOOGLE_MAPS
  | typeof URL_TYPE_LINKEDIN
  | typeof URL_TYPE_FACEBOOK
  | typeof URL_TYPE_SOURCE
  | typeof URL_TYPE_UNKNOWN;

// ---------------------------------------------------------------------------
// Helpers — normalize URL for pattern matching
// ---------------------------------------------------------------------------

/**
 * Normalize a URL string for pattern matching.
 * Strips protocol, www prefix, trailing slashes, and query params for domain checking.
 */
function normalizeUrl(raw: string): string {
  let url = raw.trim().toLowerCase();

  // Strip protocol
  url = url.replace(/^https?:\/\//, "");
  url = url.replace(/^ftp:\/\//, "");

  // Strip www prefix
  url = url.replace(/^www\./, "");

  // Strip trailing slash
  url = url.replace(/\/+$/, "");

  // Strip common tracking params for cleaner matching
  url = url.replace(/\?.*$/, "");
  url = url.replace(/#.*$/, "");

  return url;
}

// ---------------------------------------------------------------------------
// Known URL domains — sorted for priority matching
// ---------------------------------------------------------------------------

/** Returns a URL's normalized domain (e.g., "maps.google.com" from "https://maps.google.com/…"). */
function getDomain(url: string): string {
  const normalized = normalizeUrl(url);
  return normalized.split("/")[0] || "";
}

/** Returns the normalized path portion of a URL. */
function getPath(url: string): string {
  const normalized = normalizeUrl(url);
  const slashIndex = normalized.indexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex) : "";
}

// ---------------------------------------------------------------------------
// Single URL classification
// ---------------------------------------------------------------------------

/**
 * Classify a single URL string.
 *
 * Pattern-based, deterministic classification:
 *
 * Google Maps:
 *   - maps.google.com/* → google_maps_url
 *   - goo.gl/maps/* → google_maps_url
 *   - google.com/maps* → google_maps_url
 *
 * LinkedIn:
 *   - linkedin.com/company/* → linkedin_url
 *   - linkedin.com/in/* → linkedin_url
 *   - linkedin.com/school/* → linkedin_url
 *
 * Facebook:
 *   - facebook.com/* → facebook_url
 *   - fb.com/* → facebook_url
 *
 * Generic valid URL → website
 * Empty / non-URL → unknown
 * Specifically unrecognizable → source_url (conservative catch-all)
 */
export function classifyUrl(raw: string): UrlClassification {
  // Empty / whitespace
  if (!raw || raw.trim().length === 0) {
    return URL_TYPE_UNKNOWN;
  }

  const trimmed = raw.trim();

  // Check if it looks like a URL (has a scheme, or starts with common domain chars)
  const looksLikeUrl =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("ftp://") ||
    /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(trimmed);

  if (!looksLikeUrl) {
    return URL_TYPE_UNKNOWN;
  }

  const domain = getDomain(trimmed);
  const path = getPath(trimmed);

  // --- Google Maps ---
  if (
    domain === "maps.google.com" ||
    domain === "maps.app.goo.gl" ||
    domain === "goo.gl" ||
    domain === "google.com" ||
    domain === "www.google.com"
  ) {
    // Check for maps path
    if (domain === "goo.gl" && path.startsWith("/maps")) {
      return URL_TYPE_GOOGLE_MAPS;
    }
    if (domain === "maps.app.goo.gl") {
      return URL_TYPE_GOOGLE_MAPS;
    }
    if (
      path.startsWith("/maps") ||
      path.startsWith("/travel/hotels") ||
      path.startsWith("/local") ||
      path.startsWith("/place") ||
      path.startsWith("/business")
    ) {
      return URL_TYPE_GOOGLE_MAPS;
    }
  }

  // --- LinkedIn ---
  if (
    domain === "linkedin.com" ||
    domain === "www.linkedin.com"
  ) {
    if (
      path.startsWith("/company") ||
      path.startsWith("/in/") ||
      path.startsWith("/school") ||
      path.startsWith("/showcase") ||
      path.startsWith("/mycompany")
    ) {
      return URL_TYPE_LINKEDIN;
    }
  }

  // --- Facebook ---
  if (
    domain === "facebook.com" ||
    domain === "www.facebook.com" ||
    domain === "fb.com" ||
    domain === "www.fb.com" ||
    domain === "m.facebook.com"
  ) {
    return URL_TYPE_FACEBOOK;
  }

  // --- Generic website ---
  // Has a valid domain-like structure
  return URL_TYPE_WEBSITE;
}

// ---------------------------------------------------------------------------
// Column-level classification (sample-driven)
// ---------------------------------------------------------------------------

export interface UrlColumnResult {
  /** The column index in the headers array. */
  columnIndex: number;
  /** The classified canonical field key. */
  canonicalField: UrlClassification | null;
  /** How many sample values matched the dominant type. */
  matchedCount: number;
  /** Total sample values examined. */
  totalCount: number;
  /** The column's source header name. */
  sourceHeader: string;
}

/**
 * Classify URL-type columns by sampling their values.
 *
 * Examines actual cell values (not column names) to determine
 * whether a column contains Google Maps links, LinkedIn URLs,
 * Facebook URLs, or generic website URLs.
 *
 * Only processes columns that map to `website` via alias matching
 * (e.g., the "url" column), plus any unresolved column whose values
 * look like URLs (classifies those as source_url or website).
 *
 * @param rawHeaders — original CSV column headers
 * @param sampleRows — first N data rows as sample data
 * @param websiteAliasColumnIndices — indices of columns that mapped to website via alias
 * @param unresolvedColumnIndices — indices of columns that had no mapping
 * @returns map of column index → resolved canonical field key (only for columns that should be reclassified)
 */
export function classifyUrlColumns(
  rawHeaders: string[],
  sampleRows: string[][],
  websiteAliasColumnIndices: number[],
  unresolvedColumnIndices: number[],
): Map<number, string> {
  const result = new Map<number, string>();

  if (sampleRows.length === 0) return result;

  // Classify columns that mapped to website via alias (e.g., "url" column)
  for (const colIdx of websiteAliasColumnIndices) {
    const classification = classifyColumnByValues(colIdx, sampleRows);
    if (classification && classification !== URL_TYPE_WEBSITE) {
      result.set(colIdx, classification);
    }
  }

  // Classify unresolved columns that look like URLs → map to source_url or website
  for (const colIdx of unresolvedColumnIndices) {
    const values = sampleRows.map((r) => r[colIdx] || "").filter(Boolean);
    if (values.length === 0) continue;

    const urlCount = values.filter((v) => looksLikeUrl(v)).length;
    // If >50% of non-empty values look like URLs, classify as source_url
    if (urlCount / values.length > 0.5) {
      const classification = classifyColumnByValues(colIdx, sampleRows);
      if (classification && classification !== URL_TYPE_UNKNOWN) {
        result.set(colIdx, classification);
      } else {
        result.set(colIdx, URL_TYPE_SOURCE);
      }
    }
  }

  return result;
}

/**
 * Classify a single column's values to determine its URL type.
 * Returns the dominant classification from sampled values.
 */
function classifyColumnByValues(colIdx: number, sampleRows: string[][]): string | null {
  const values = sampleRows.map((r) => r[colIdx] || "").filter(Boolean);
  if (values.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const v of values) {
    const type = classifyUrl(v);
    if (type === URL_TYPE_UNKNOWN) continue;
    counts[type] = (counts[type] || 0) + 1;
  }

  const entries = Object.entries(counts);
  if (entries.length === 0) return null;

  // Find the type with the most votes
  entries.sort((a, b) => b[1] - a[1]);
  const [topType, topCount] = entries[0];
  const total = values.length;

  // Require at least 50% of non-empty values to match the top type
  if (topCount / total >= 0.5) {
    return topType;
  }

  return null;
}

/** Quick check if a string looks like a URL. */
function looksLikeUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("ftp://") ||
    /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(v)
  );
}
