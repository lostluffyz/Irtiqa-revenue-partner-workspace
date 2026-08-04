// ============================================
// Provider detection info — frontend display helper
// ============================================
//
// Pure presentation logic. Computes which provider signature
// headers matched a given set of CSV headers. This is used
// to render the "Detected because:" section in the provider card.
//
// The backend detectProvider() handles actual detection;
// this module only provides display details for the UI.

/** Signature patterns for known providers (mirrors backend for display). */
const PROVIDER_SIGNATURES: Record<string, string[]> = {
  "Google Maps": [
    "rating", "reviews", "latitude", "longitude", "plus_code",
    "google_maps_url", "maps_url", "place_url", "gmb_url",
    "total_score", "place id",
  ],
  "Apify": [
    "title", "sourceUrl", "linkedInUrl",
    "zipCode", "city", "state",
  ],
  "Outscraper": [
    "place_id", "google_id", "sic", "naics",
    "site", "full_address", "timezone",
  ],
  "Clay": [
    "enriched", "person_linkedin_url", "company_linkedin_url",
    "person_name", "job_title", "job_company_name",
  ],
  "Instant Data Scraper": [
    "_id", "page_url", "scraped_at",
    "data_id", "data_name",
  ],
  "Apollo": [
    "first_name", "last_name", "person_linkedin_url",
    "company_linkedin_url", "company_website_url",
    "organization_name", "phone_numbers", "direct_phone",
  ],
};

export interface ProviderMatchDetail {
  /** Provider name. */
  name: string;
  /** Confidence percentage (mirrors backend). */
  confidence: number;
  /** Headers that matched the provider's signature. */
  matchedHeaders: string[];
  /** Total signature patterns for this provider. */
  totalSignaturePatterns: number;
  /** Whether the provider is recognized (not Unknown). */
  detected: boolean;
}

/**
 * Compute which headers matched a provider's signature patterns.
 * Used to render the "Detected because:" explanation in the provider card.
 *
 * @param providerName — the detected provider name
 * @param rawHeaders — the original CSV column headers
 * @returns ProviderMatchDetail with matched headers
 */
export function getProviderMatchDetail(
  providerName: string,
  rawHeaders: string[],
  confidence: number,
): ProviderMatchDetail {
  const signatures = PROVIDER_SIGNATURES[providerName];
  if (!signatures || rawHeaders.length === 0) {
    return {
      name: providerName,
      confidence,
      matchedHeaders: [],
      totalSignaturePatterns: 0,
      detected: providerName !== "Unknown",
    };
  }

  // Normalize headers for matching
  const normalizedHeaders = new Set(
    rawHeaders.map((h) =>
      h.trim().toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, ""),
    ),
  );

  const matched: string[] = [];

  for (const sig of signatures) {
    const sigNorm = sig.toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, "");
    // Find the original header that matches
    for (const rawHeader of rawHeaders) {
      const headerNorm = rawHeader.trim().toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, "");
      if (headerNorm === sigNorm) {
        matched.push(rawHeader);
        break;
      }
    }
  }

  return {
    name: providerName,
    confidence,
    matchedHeaders: [...new Set(matched)], // deduplicate
    totalSignaturePatterns: signatures.length,
    detected: providerName !== "Unknown",
  };
}
