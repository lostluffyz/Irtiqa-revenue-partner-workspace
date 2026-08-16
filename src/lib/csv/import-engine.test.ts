import { describe, it, expect } from "vitest";
import { normalizeHeader } from "./header-normalization";
import { ALIAS_TO_CANONICAL, CANONICAL_FIELDS, ALLOWED_CSV_FIELDS, PROTECTED_CANONICAL_KEYS } from "./alias-registry";
import { mapHeader, analyzeHeaders, buildAnalysisFromMappings, resolveColumnTypes } from "./header-mapper";
import { buildCanonicalRows, normalizeFieldValue } from "./row-builder";
import { parseCsvText, analyzeCsvFile, importCsv, detectProvider, computeFieldQuality, computeFieldConfidence, matchTierToConfidence, estimateImportSuccess } from "./import-engine";
import { classifyUrl, classifyUrlColumns } from "./url-classifier";

// ============================================
// Phase 2 — Header Normalization
// ============================================

describe("normalizeHeader", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeHeader("  Company Name  ")).toBe("company name");
  });

  it("lowercases", () => {
    expect(normalizeHeader("COMPANY_NAME")).toBe("company name");
  });

  it("replaces underscores with spaces", () => {
    expect(normalizeHeader("business_email")).toBe("business email");
  });

  it("replaces hyphens with spaces", () => {
    expect(normalizeHeader("COMPANY-NAME")).toBe("company name");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeHeader("Company   Name")).toBe("company name");
  });

  it("handles mixed punctuation", () => {
    expect(normalizeHeader("  Business_Email-Address  ")).toBe("business email address");
  });

  it("handles already-normal canonical header", () => {
    expect(normalizeHeader("company_name")).toBe("company name");
  });

  it("handles empty string", () => {
    expect(normalizeHeader("")).toBe("");
  });

  it("handles only whitespace", () => {
    expect(normalizeHeader("   ")).toBe("");
  });
});

// ============================================
// Phase 3 — Alias Registry
// ============================================

describe("ALIAS_TO_CANONICAL", () => {
  it("maps 'company' to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("company"))).toBe("company_name");
  });

  it("maps 'business_name' to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("business_name"))).toBe("company_name");
  });

  it("maps 'name' to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("name"))).toBe("company_name");
  });

  it("maps 'title' to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("title"))).toBe("company_name");
  });

  it("maps 'firm' to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("firm"))).toBe("company_name");
  });

  it("maps 'vendor' to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("vendor"))).toBe("company_name");
  });

  it("maps 'email' to email", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("email"))).toBe("email");
  });

  it("maps 'business_email' to email", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("business_email"))).toBe("email");
  });

  it("maps 'phone_number' to phone", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("phone_number"))).toBe("phone");
  });

  it("maps 'mobile' to phone", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("mobile"))).toBe("phone");
  });

  it("maps 'category' to industry", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("category"))).toBe("industry");
  });

  it("maps 'country_name' to country", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("country_name"))).toBe("country");
  });

  it("returns undefined for unknown header", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("totally_unknown_field"))).toBeUndefined();
  });

  it("maps 'organisation' (British spelling) to company_name", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("organisation"))).toBe("company_name");
  });

  it("maps 'url' to website", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("url"))).toBe("website");
  });

  it("maps 'domain' to website", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("domain"))).toBe("website");
  });

  it("maps 'notes' to internal_notes", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("notes"))).toBe("internal_notes");
  });

  // New recognition-only fields
  it("maps 'city' to city", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("city"))).toBe("city");
  });

  it("maps 'zip_code' to postal_code", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("zip_code"))).toBe("postal_code");
  });

  it("maps 'linkedin' to linkedin_url", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("linkedin"))).toBe("linkedin_url");
  });

  it("maps 'facebook' to facebook_url", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("facebook"))).toBe("facebook_url");
  });

  it("maps 'google_maps_url' to google_maps_url", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("google_maps_url"))).toBe("google_maps_url");
  });

  it("maps 'source_url' to source_url", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("source_url"))).toBe("source_url");
  });

  it("maps 'street_address' to address", () => {
    expect(ALIAS_TO_CANONICAL.get(normalizeHeader("street_address"))).toBe("address");
  });
});

// ============================================
// Phase 4 — Deterministic Mapping
// ============================================

describe("mapHeader", () => {
  it("resolves exact canonical header", () => {
    const result = mapHeader("company_name");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_canonical");
  });

  it("resolves uppercase canonical header via normalization", () => {
    const result = mapHeader("COMPANY_NAME");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_canonical");
  });

  it("resolves space-variant header", () => {
    const result = mapHeader("company name");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_canonical");
  });

  it("resolves alias header (business → company_name)", () => {
    const result = mapHeader("Business");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_alias");
  });

  it("resolves 'name' header (name → company_name)", () => {
    const result = mapHeader("name");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_alias");
  });

  it("resolves 'title' header (title → company_name)", () => {
    const result = mapHeader("title");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_alias");
  });

  it("resolves 'firm' header (firm → company_name)", () => {
    const result = mapHeader("Firm");
    expect(result.canonicalField).toBe("company_name");
    expect(result.matchTier).toBe("exact_alias");
  });

  it("resolves hyphenated alias", () => {
    const result = mapHeader("business-email");
    expect(result.canonicalField).toBe("email");
    expect(result.matchTier).toBe("exact_alias");
  });

  it("resolves 'primary email' alias", () => {
    const result = mapHeader("primary email");
    expect(result.canonicalField).toBe("email");
    expect(result.matchTier).toBe("exact_alias");
  });

  it("resolves 'city' via exact_canonical", () => {
    const result = mapHeader("city");
    expect(result.canonicalField).toBe("city");
    expect(result.matchTier).toBe("exact_canonical");
  });

  it("resolves 'google maps url' via normalized canonical match", () => {
    const result = mapHeader("google maps url");
    expect(result.canonicalField).toBe("google_maps_url");
    // Normalized "google maps url" matches normalized "google_maps_url" → exact_canonical
    expect(result.matchTier).toBe("exact_canonical");
  });

  it("leaves unknown header unresolved", () => {
    const result = mapHeader("totally_unknown_field");
    expect(result.canonicalField).toBeNull();
    expect(result.matchTier).toBe("unresolved");
  });

  it("produces correct sourceHeader and normalizedHeader", () => {
    const result = mapHeader(" Business Email ");
    expect(result.sourceHeader).toBe(" Business Email ");
    expect(result.normalizedHeader).toBe("business email");
    expect(result.canonicalField).toBe("email");
    expect(result.matchReason).toContain("alias");
  });
});

// ============================================
// Phase 5 — Ambiguity Detection + Confidence Resolution
// ============================================

describe("analyzeHeaders — ambiguity detection with confidence", () => {
  it("detects no ambiguity with clean headers", () => {
    const result = analyzeHeaders(["company_name", "email", "phone"]);
    expect(result.hasAmbiguity).toBe(false);
    expect(result.hasMissingRequired).toBe(false);
    expect(result.resolvedFields).toContain("company_name");
  });

  it("auto-resolves when tiers differ (canonical beats alias)", () => {
    // 'company_name' is exact_canonical, 'Business' is exact_alias
    const result = analyzeHeaders(["company_name", "Business", "email"]);
    expect(result.hasAmbiguity).toBe(false);
    expect(result.resolvedFields).toContain("company_name");
  });

  it("detects ambiguity when same-tier candidates compete", () => {
    // Both 'Business' and 'Organization' are exact_alias → company_name
    const result = analyzeHeaders(["Business", "Organization", "email"]);
    expect(result.hasAmbiguity).toBe(true);
    expect(result.ambiguousFields).toContain("company_name");
  });

  it("detects multiple same-tier email candidates", () => {
    const result = analyzeHeaders(["company_name", "Business Email", "Work Email"]);
    expect(result.hasAmbiguity).toBe(true);
    expect(result.ambiguousFields).toContain("email");
  });

  it("blocks when ambiguity exists in same-tier (no resolution)", () => {
    const analysis = analyzeHeaders(["Business", "Organization", "email"]);
    expect(analysis.hasAmbiguity).toBe(true);
  });
});

// ============================================
// Phase 6 — Extra Column Tolerance
// ============================================

describe("analyzeHeaders — extra/supplemental columns", () => {
  it("does not fail with unknown columns", () => {
    const headers = [
      "Business Name", "Email", "Phone", "Category", "Country",
      "Website", "Full Address", "City", "State", "Rating",
      "Reviews", "Google Maps URL", "Place ID", "LinkedIn",
      "Facebook", "Instagram", "Owner Name", "Source",
    ];
    const result = analyzeHeaders(headers);
    expect(result.hasMissingRequired).toBe(false);
    expect(result.unmappedCount).toBeGreaterThan(0);
    expect(result.unmappedHeaders).toContain("Rating");
    expect(result.unmappedHeaders).toContain("Reviews");
    expect(result.unmappedHeaders).toContain("Instagram");
    expect(result.resolvedFields).toContain("company_name");
    expect(result.resolvedFields).toContain("email");
    expect(result.resolvedFields).toContain("phone");
    // Recognition-only fields resolve too
    expect(result.resolvedFields).toContain("city");
    expect(result.resolvedFields).toContain("linkedin_url");
    expect(result.resolvedFields).toContain("facebook_url");
  });

  it("accepts CSV with only required columns", () => {
    const result = analyzeHeaders(["Business Name"]);
    expect(result.hasMissingRequired).toBe(false);
    expect(result.resolvedFields).toContain("company_name");
  });

  it("handles 100+ column scraper-style spread", () => {
    const base = ["Business Name", "Email", "Phone", "Category", "Country", "Website"];
    const extra = Array.from({ length: 100 }, (_, i) => `col_${i}`);
    const headers = [...base, ...extra];
    const result = analyzeHeaders(headers);
    expect(result.hasMissingRequired).toBe(false);
    expect(result.unmappedCount).toBe(100);
  });
});

// ============================================
// Phase 7 — Row Value Normalization
// ============================================

describe("normalizeFieldValue", () => {
  it("trims whitespace", () => {
    expect(normalizeFieldValue("company_name", "  Acme Corp  ")).toBe("Acme Corp");
  });

  it("lowercases email", () => {
    expect(normalizeFieldValue("email", "  User@Example.COM  ")).toBe("user@example.com");
  });

  it("preserves phone with leading +", () => {
    expect(normalizeFieldValue("phone", "+919876543210")).toBe("+919876543210");
  });

  it("preserves phone with leading zeros", () => {
    expect(normalizeFieldValue("phone", "0044123456789")).toBe("0044123456789");
  });

  it("trims phone whitespace only", () => {
    expect(normalizeFieldValue("phone", "  +1 555-0100  ")).toBe("+1 555-0100");
  });

  it("trims website", () => {
    expect(normalizeFieldValue("website", "  https://acme.com  ")).toBe("https://acme.com");
  });

  it("trims industry", () => {
    expect(normalizeFieldValue("industry", "  Technology  ")).toBe("Technology");
  });

  it("trims country", () => {
    expect(normalizeFieldValue("country", "  United States  ")).toBe("United States");
  });

  it("returns empty string unchanged for email", () => {
    expect(normalizeFieldValue("email", "")).toBe("");
  });

  // Spreadsheet error normalization
  it("converts #N/A to empty string", () => {
    expect(normalizeFieldValue("company_name", "#N/A")).toBe("");
  });

  it("converts #ERROR! to empty string", () => {
    expect(normalizeFieldValue("company_name", "#ERROR!")).toBe("");
  });

  it("converts #VALUE! to empty string", () => {
    expect(normalizeFieldValue("company_name", "#VALUE!")).toBe("");
  });

  it("converts #REF! to empty string", () => {
    expect(normalizeFieldValue("company_name", "#REF!")).toBe("");
  });

  it("converts #NAME? to empty string", () => {
    expect(normalizeFieldValue("company_name", "#NAME?")).toBe("");
  });

  it("converts #DIV/0! to empty string", () => {
    expect(normalizeFieldValue("company_name", "#DIV/0!")).toBe("");
  });

  it("converts NULL to empty string", () => {
    expect(normalizeFieldValue("company_name", "NULL")).toBe("");
  });

  it("converts N/A to empty string", () => {
    expect(normalizeFieldValue("company_name", "N/A")).toBe("");
  });

  it("converts NA to empty string", () => {
    expect(normalizeFieldValue("company_name", "NA")).toBe("");
  });

  it("converts dash to empty string", () => {
    expect(normalizeFieldValue("company_name", "-")).toBe("");
  });

  it("converts 'Unknown' to empty string", () => {
    expect(normalizeFieldValue("company_name", "Unknown")).toBe("");
  });

  it("converts 'None' to empty string", () => {
    expect(normalizeFieldValue("company_name", "None")).toBe("");
  });

  it("converts 'undefined' to empty string", () => {
    expect(normalizeFieldValue("company_name", "undefined")).toBe("");
  });

  it("preserves valid values mixed with error-like text", () => {
    expect(normalizeFieldValue("company_name", "A#N/A")).toBe("A#N/A");
    expect(normalizeFieldValue("company_name", "Not None")).toBe("Not None");
  });

  it("converts case-insensitive null variants", () => {
    expect(normalizeFieldValue("company_name", "null")).toBe("");
    expect(normalizeFieldValue("company_name", "NONE")).toBe("");
    expect(normalizeFieldValue("company_name", "UNKNOWN")).toBe("");
  });
});

// ============================================
// Phase 8 — Required Field and Partial Data
// ============================================

describe("buildCanonicalRows — required fields", () => {
  it("accepts row with company_name only", () => {
    const result = buildCanonicalRows(
      [["Acme Corp"]],
      ["company_name"],
      analyzeHeaders(["company_name"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.validRows[0].company_name).toBe("Acme Corp");
    expect(result.validRows[0].status).toBe("not_contacted");
    expect(result.validRows[0].created_by).toBe("admin-uuid");
  });

  it("handles spreadsheet error values in company_name — converts to null", () => {
    const result = buildCanonicalRows(
      [["#N/A"]],
      ["company_name"],
      analyzeHeaders(["company_name"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(0);
    expect(result.invalidCount).toBe(1);
    expect(result.rowErrors[0].error).toContain("company_name");
  });

  it("rejects row with missing company_name", () => {
    const result = buildCanonicalRows(
      [[""]],
      ["company_name"],
      analyzeHeaders(["company_name"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(0);
    expect(result.invalidCount).toBe(1);
    expect(result.rowErrors[0].error).toContain("company_name");
  });

  it("accepts optional fields as null when empty", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "", "", ""]],
      ["company_name", "email", "phone", "website"],
      analyzeHeaders(["company_name", "email", "phone", "website"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0].email).toBeNull();
    expect(result.validRows[0].phone).toBeNull();
  });
});

// ============================================
// Phase 12 — Authorization and Trust Boundary
// ============================================

describe("PROTECTED_CANONICAL_KEYS", () => {
  it("includes id", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("id");
  });

  it("includes assigned_to", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("assigned_to");
  });

  it("includes created_at", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("created_at");
  });

  it("includes created_by", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("created_by");
  });

  it("includes status", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("status");
  });

  it("includes updated_at", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("updated_at");
  });

  it("includes owner_id", () => {
    expect(PROTECTED_CANONICAL_KEYS).toContain("owner_id");
  });
});

describe("ALLOWED_CSV_FIELDS", () => {
  it("includes company_name", () => {
    expect(ALLOWED_CSV_FIELDS.has("company_name")).toBe(true);
  });

  it("does NOT include id", () => {
    expect(ALLOWED_CSV_FIELDS.has("id")).toBe(false);
  });

  it("does NOT include assigned_to", () => {
    expect(ALLOWED_CSV_FIELDS.has("assigned_to")).toBe(false);
  });

  it("DOES include city (stored since migration 007)", () => {
    expect(ALLOWED_CSV_FIELDS.has("city")).toBe(true);
  });

  it("DOES include state (stored since migration 007)", () => {
    expect(ALLOWED_CSV_FIELDS.has("state")).toBe(true);
  });

  it("does NOT include google_maps_url (recognition-only)", () => {
    expect(ALLOWED_CSV_FIELDS.has("google_maps_url")).toBe(false);
  });

  it("does NOT include linkedin_url (recognition-only)", () => {
    expect(ALLOWED_CSV_FIELDS.has("linkedin_url")).toBe(false);
  });

  it("has exactly 9 stored fields (company_name, website, phone, email, industry, country, internal_notes, city, state)", () => {
    let count = 0;
    for (const _ of ALLOWED_CSV_FIELDS) count++;
    expect(count).toBe(9);
  });
});

describe("buildCanonicalRows — injection protection", () => {
  it("ignores id header (maps to nothing in row builder)", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "some-id"]],
      ["company_name", "id"],
      analyzeHeaders(["company_name", "id"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0]).not.toHaveProperty("id");
  });

  it("ignores assigned_to header", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "some-partner-uuid"]],
      ["company_name", "assigned_to"],
      analyzeHeaders(["company_name", "assigned_to"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0]).not.toHaveProperty("assigned_to");
  });

  it("ignores created_at header", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "2026-01-01"]],
      ["company_name", "created_at"],
      analyzeHeaders(["company_name", "created_at"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0]).not.toHaveProperty("created_at");
  });

  it("ignores status header — always set to not_contacted", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "closed"]],
      ["company_name", "status"],
      analyzeHeaders(["company_name", "status"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0].status).toBe("not_contacted");
  });

  it("ignores auth_user_id header", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "some-auth-id"]],
      ["company_name", "auth_user_id"],
      analyzeHeaders(["company_name", "auth_user_id"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0]).not.toHaveProperty("auth_user_id");
  });

  it("does insert city (now a stored field since migration 007)", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "New York"]],
      ["company_name", "city"],
      analyzeHeaders(["company_name", "city"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    // 'city' is now a stored field; should appear in insert object
    expect(result.validRows[0]).toHaveProperty("city", "New York");
  });

  it("does not insert google_maps_url (recognition-only)", () => {
    const result = buildCanonicalRows(
      [["Acme Corp", "https://maps.google.com/..."]],
      ["company_name", "google_maps_url"],
      analyzeHeaders(["company_name", "google_maps_url"]),
      null,
      "admin-uuid",
    );
    expect(result.validCount).toBe(1);
    expect(result.validRows[0]).not.toHaveProperty("google_maps_url");
  });
});

// ============================================
// Phase 11 — Equivalent alias mapping produces same normalized rows
// ============================================

describe("buildCanonicalRows — alias equivalence", () => {
  it("produces identical canonical rows for 'company' vs 'company_name'", () => {
    const result1 = buildCanonicalRows(
      [["Acme Corp"]],
      ["company"],
      analyzeHeaders(["company"]),
      null,
      "admin-uuid",
    );
    const result2 = buildCanonicalRows(
      [["Acme Corp"]],
      ["company_name"],
      analyzeHeaders(["company_name"]),
      null,
      "admin-uuid",
    );
    expect(result1.validRows[0].company_name).toBe(result2.validRows[0].company_name);
  });

  it("alias-mapped website enters same canonical path as direct website header", () => {
    const result1 = buildCanonicalRows(
      [["Acme Corp", "acme.com"]],
      ["company_name", "website"],
      analyzeHeaders(["company_name", "website"]),
      null,
      "admin-uuid",
    );
    const result2 = buildCanonicalRows(
      [["Acme Corp", "acme.com"]],
      ["company_name", "company_url"],
      analyzeHeaders(["company_name", "company_url"]),
      null,
      "admin-uuid",
    );
    expect(result1.validRows[0].website).toBe(result2.validRows[0].website);
  });
});

// ============================================
// URL Classification Tests
// ============================================

describe("classifyUrl", () => {
  it("classifies Google Maps link", () => {
    expect(classifyUrl("https://maps.google.com/maps?q=Acme+Corp")).toBe("google_maps_url");
  });

  it("classifies maps.app.goo.gl link", () => {
    expect(classifyUrl("https://maps.app.goo.gl/abc123")).toBe("google_maps_url");
  });

  it("classifies google.com/maps link", () => {
    expect(classifyUrl("https://www.google.com/maps/place/Acme+Corp")).toBe("google_maps_url");
  });

  it("classifies LinkedIn company link", () => {
    expect(classifyUrl("https://linkedin.com/company/acme-corp")).toBe("linkedin_url");
  });

  it("classifies LinkedIn profile link", () => {
    expect(classifyUrl("https://www.linkedin.com/in/johndoe")).toBe("linkedin_url");
  });

  it("classifies Facebook link", () => {
    expect(classifyUrl("https://facebook.com/acmecorp")).toBe("facebook_url");
  });

  it("classifies fb.com link", () => {
    expect(classifyUrl("https://fb.com/acmecorp")).toBe("facebook_url");
  });

  it("keeps generic URL as website", () => {
    expect(classifyUrl("https://acme.com")).toBe("website");
  });

  it("keeps www domain as website", () => {
    expect(classifyUrl("https://www.acme.com/about")).toBe("website");
  });

  it("returns unknown for empty string", () => {
    expect(classifyUrl("")).toBe("unknown");
  });

  it("returns unknown for non-URL text", () => {
    expect(classifyUrl("not a url")).toBe("unknown");
  });

  it("classifies Google travel link as google_maps_url", () => {
    expect(classifyUrl("https://www.google.com/travel/hotels/...")).toBe("google_maps_url");
  });

  it("classifies LinkedIn school link", () => {
    expect(classifyUrl("https://www.linkedin.com/school/harvard")).toBe("linkedin_url");
  });
});

describe("classifyUrlColumns", () => {
  const headers = ["url", "website", "source"];
  const sampleRows = [
    ["https://maps.google.com/maps?q=Acme", "https://acme.com", "https://scraper.com/data.csv"],
    ["https://maps.google.com/maps?q=Other", "https://other.com", "https://scraper.com/other.csv"],
  ];

  it("reclassifies url column as google_maps_url when values are Map links", () => {
    const result = classifyUrlColumns(headers, sampleRows, [0], []);
    expect(result.get(0)).toBe("google_maps_url");
  });

  it("does not reclassify website column (exact_canonical)", () => {
    const result = classifyUrlColumns(headers, sampleRows, [0], []);
    // Column 1 is not in websiteAliasColumnIndices, so it's not checked
    expect(result.has(1)).toBe(false);
  });

  it("classifies unresolved URL-looking columns — maps generic URLs to website", () => {
    const result = classifyUrlColumns(headers, sampleRows, [], [2]);
    // Generic website URLs like "https://scraper.com/data.csv" are classified as website
    expect(result.get(2)).toBe("website");
  });

  it("returns empty map when no URL columns to classify", () => {
    const result = classifyUrlColumns(headers, [[]], [], []);
    expect(result.size).toBe(0);
  });
});

// ============================================
// ResolveColumnTypes (header mapper) Tests
// ============================================

describe("resolveColumnTypes", () => {
  it("reclassifies url column to Maps when values are Google Maps links", () => {
    const headers = ["company_name", "url"];
    const initialMappings = headers.map((h) => mapHeader(h));
    const sampleRows = [["Acme Corp", "https://maps.google.com/maps?q=Acme"]];
    const result = resolveColumnTypes(headers, initialMappings, sampleRows);
    // url column should be reclassified from website to google_maps_url
    const urlMapping = result.columnMappings[1];
    expect(urlMapping.canonicalField).toBe("google_maps_url");
    expect(urlMapping.matchReason).toContain("URL analysis");
  });

  it("does not reclassify url when values are generic websites", () => {
    const headers = ["company_name", "url"];
    const initialMappings = headers.map((h) => mapHeader(h));
    const sampleRows = [["Acme Corp", "https://acme.com"]];
    const result = resolveColumnTypes(headers, initialMappings, sampleRows);
    const urlMapping = result.columnMappings[1];
    expect(urlMapping.canonicalField).toBe("website");
  });

  it("keeps original mappings when no sample data", () => {
    const headers = ["company_name", "url"];
    const initialMappings = headers.map((h) => mapHeader(h));
    const result = resolveColumnTypes(headers, initialMappings, null);
    expect(result.columnMappings[0].canonicalField).toBe("company_name");
    expect(result.columnMappings[1].canonicalField).toBe("website");
  });
});

// ============================================
// Phase 13 — Full CSV Parse Tests
// ============================================

describe("parseCsvText", () => {
  it("parses simple CSV", () => {
    const csv = "company_name,email\nAcme Corp,acme@test.com\n";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "email"]);
    expect(rows).toEqual([["Acme Corp", "acme@test.com"]]);
  });

  it("handles quoted values containing commas", () => {
    const csv = 'company_name,notes\n"Acme, Inc.","Note with, comma"\n';
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "notes"]);
    expect(rows).toEqual([["Acme, Inc.", "Note with, comma"]]);
  });

  it("handles CRLF line endings", () => {
    const csv = "company_name,email\r\nAcme Corp,acme@test.com\r\n";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "email"]);
    expect(rows).toEqual([["Acme Corp", "acme@test.com"]]);
  });

  it("handles blank trailing lines", () => {
    const csv = "company_name,email\nAcme Corp,acme@test.com\n\n\n";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "email"]);
    expect(rows).toEqual([["Acme Corp", "acme@test.com"]]);
  });

  it("handles header-only CSV (no data rows)", () => {
    const csv = "company_name,email,phone\n";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "email", "phone"]);
    expect(rows).toEqual([]);
  });

  it("handles empty file", () => {
    const { headers, rows } = parseCsvText("");
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it("handles UTF-8 headers", () => {
    const csv = "entreprise,email\nAcme Corp,acme@test.com\n";
    const { headers } = parseCsvText(csv);
    expect(headers[0]).toBe("entreprise");
  });
});

// ============================================
// Phase 13 — Full Import Engine Tests
// ============================================

describe("analyzeCsvFile", () => {
  it("produces analysis for valid CSV", () => {
    const csv = "company_name,email,phone\nAcme Corp,acme@test.com,+15550100\n";
    const result = analyzeCsvFile(csv);
    expect(result.canProceed).toBe(true);
    expect(result.totalRows).toBe(1);
    expect(result.rawHeaders).toEqual(["company_name", "email", "phone"]);
    expect(result.mappingAnalysis.resolvedFields).toContain("company_name");
    expect(result.previewRows).toHaveLength(1);
  });

  it("blocks when required column missing", () => {
    const csv = "email,phone\nacme@test.com,+15550100\n";
    const result = analyzeCsvFile(csv);
    expect(result.canProceed).toBe(false);
    expect(result.mappingAnalysis.hasMissingRequired).toBe(true);
  });

  it("blocks when same-tier ambiguity exists (no auto-resolution)", () => {
    const csv = "Business,Organization,email\nAcme Corp,Other Corp,acme@test.com\n";
    const result = analyzeCsvFile(csv);
    expect(result.canProceed).toBe(false);
    expect(result.mappingAnalysis.hasAmbiguity).toBe(true);
  });

  it("auto-resolves different-tier ambiguity", () => {
    // company_name (exact_canonical) beats Business (exact_alias)
    const csv = "company_name,Business,email\nAcme Corp,Other Corp,acme@test.com\n";
    const result = analyzeCsvFile(csv);
    expect(result.canProceed).toBe(true);
    expect(result.mappingAnalysis.hasAmbiguity).toBe(false);
  });

  // Apify-style CSV
  it("handles Apify-style CSV with recognition-only fields and URL reclassification", () => {
    const csv = [
      "title,url,phone,email,city,state,zipCode,address,linkedInUrl,source_url",
      "Acme Corp,https://acme.com,+15550100,info@acme.com,New York,NY,10001,123 Main St,https://linkedin.com/company/acme,https://apify.com/run/1",
    ].join("\n");
    const result = analyzeCsvFile(csv);
    expect(result.canProceed).toBe(true);
    expect(result.mappingAnalysis.resolvedFields).toContain("company_name");
    expect(result.mappingAnalysis.resolvedFields).toContain("city");
    expect(result.mappingAnalysis.resolvedFields).toContain("linkedin_url");
    expect(result.mappingAnalysis.resolvedFields).toContain("phone");
    expect(result.mappingAnalysis.resolvedFields).toContain("email");
    // source_url is directly mapped via alias; linkedInUrl is reclassified by URL analysis
    expect(result.mappingAnalysis.resolvedFields).toContain("source_url");
    expect(result.mappingAnalysis.resolvedFields).toContain("website");
  });

  // Google Maps export CSV
  it("handles Google Maps export CSV", () => {
    const csv = [
      "name,address,category,website,phone,rating,reviews,latitude,longitude,placeId",
      "Acme Corp,123 Main St,Restaurant,https://acme.com,+15550100,4.5,120,40.7128,-74.0060,ChIJ...",
    ].join("\n");
    const result = analyzeCsvFile(csv);
    expect(result.canProceed).toBe(true);
    expect(result.mappingAnalysis.resolvedFields).toContain("company_name");
    expect(result.mappingAnalysis.resolvedFields).toContain("website");
    expect(result.mappingAnalysis.resolvedFields).toContain("phone");
    expect(result.mappingAnalysis.resolvedFields).toContain("address");
    // rating, reviews, latitude, longitude, placeId should be unmapped
    expect(result.mappingAnalysis.unmappedHeaders).toContain("rating");
    expect(result.mappingAnalysis.unmappedHeaders).toContain("reviews");
    expect(result.mappingAnalysis.unmappedHeaders).toContain("latitude");
  });
});

describe("importCsv", () => {
  it("fails gracefully on empty text", async () => {
    const result = await importCsv("", {} as any, "admin-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toContain("headers");
  });

  it("fails gracefully on header-only CSV", async () => {
    const result = await importCsv("company_name,email\n", {} as any, "admin-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toContain("data rows");
  });

  it("fails gracefully when required column missing", async () => {
    const csv = "email,phone\nacme@test.com,+15550100\n";
    const result = await importCsv(csv, {} as any, "admin-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toContain("company_name");
  });

  it("fails gracefully on same-tier ambiguous columns without resolution", async () => {
    const csv = "Business,Organization\nAcme Corp,Other\n";
    const result = await importCsv(csv, {} as any, "admin-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Ambiguous");
  });

  it("computes correct counts for mix of valid rows", async () => {
    const csv = "company_name\nAcme Corp\n\nOther Corp\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.success).toBe(true);
    expect(result.rowsDetected).toBe(2);
    expect(result.rowsInvalid).toBe(0);
  });

  it("handles reordered columns", async () => {
    const csv = "email,company_name\nacme@test.com,Acme Corp\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.success).toBe(true);
    expect(result.rowsInserted).toBe(1);
  });

  it("handles scraper-style CSV with 20+ columns", async () => {
    const headers = [
      "Business Name", "Email", "Mobile Number", "Category", "Country",
      "Website", "Full Address", "City", "State", "Rating",
      "Reviews", "Google Maps URL", "Place ID", "LinkedIn",
      "Facebook", "Instagram", "Owner Name", "Source",
    ];
    const values = [
      "Test Corp", "test@corp.com", "+1-555-0100", "Technology", "US",
      "testcorp.com", "123 Main St", "New York", "NY", "4.5",
      "120", "https://maps.google.com/...", "ChIJ...", "https://linkedin.com/...",
      "https://facebook.com/...", "https://instagram.com/...", "John Doe", "ScraperV1",
    ];
    const csv = headers.join(",") + "\n" + values.join(",") + "\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.success).toBe(true);
    expect(result.rowsInserted).toBe(1);
  });

  it("handles spreadsheet null values in data rows", async () => {
    const csv = "company_name,email,phone\nAcme Corp,#N/A,N/A\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.success).toBe(true);
    expect(result.rowsInserted).toBe(1);
  });

  it("handles unknown columns without failing", async () => {
    const csv = "company_name,email,totally_random,also_unknown\nAcme Corp,acme@test.com,x,y\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.success).toBe(true);
    expect(result.rowsInserted).toBe(1);
  });
});

// ============================================
// Canonical field structure verification
// ============================================

describe("CANONICAL_FIELDS", () => {
  it("has company_name as required", () => {
    const company = CANONICAL_FIELDS.find((f) => f.canonical === "company_name");
    expect(company?.required).toBe(true);
  });

  it("has 15 canonical fields (7 stored + 8 recognition-only)", () => {
    expect(CANONICAL_FIELDS).toHaveLength(15);
  });

  it("all fields have non-empty knownAliases", () => {
    for (const field of CANONICAL_FIELDS) {
      expect(field.knownAliases.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// Reordered columns
// ============================================

describe("analyzeHeaders — reordered columns", () => {
  it("handles reverse order columns", () => {
    const result = analyzeHeaders(["country", "industry", "email", "phone", "website", "company_name"]);
    expect(result.hasMissingRequired).toBe(false);
    expect(result.resolvedFields).toContain("company_name");
    expect(result.resolvedFields).toContain("email");
    expect(result.resolvedFields).toContain("country");
  });
});

// ============================================
// Malformed CSV behavior
// ============================================

describe("parseCsvText — edge cases", () => {
  it("handles CSV with only commas (empty values)", () => {
    const csv = "company_name,email,phone\n,,\n";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "email", "phone"]);
    expect(rows).toEqual([["", "", ""]]);
  });

  it("handles quoted values with escaped quotes", () => {
    const csv = 'company_name,notes\n"Acme Corp","Note with ""quote"" inside"\n';
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["company_name", "notes"]);
    expect(rows).toEqual([['Acme Corp', 'Note with "quote" inside']]);
  });
});

// ============================================
// Provider Detection Tests
// ============================================

describe("detectProvider", () => {
  it("detects Google Maps from typical headers", () => {
    const headers = ["name", "address", "category", "website", "phone", "rating", "reviews", "latitude", "longitude", "placeId"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Google Maps");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects Google Maps from export with maps_url", () => {
    const headers = ["name", "address", "category", "website", "phone", "rating", "google_maps_url"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Google Maps");
  });

  it("detects Apify from typical headers", () => {
    const headers = ["title", "url", "phone", "email", "city", "state", "zipCode", "address", "linkedInUrl", "sourceUrl"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Apify");
  });

  it("detects Outscraper from typical headers", () => {
    const headers = ["place_id", "google_id", "sic", "naics", "site", "full_address", "phone"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Outscraper");
  });

  it("detects Apollo from typical headers", () => {
    const headers = ["first_name", "last_name", "person_linkedin_url", "company_linkedin_url", "organization_name", "phone_numbers"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Apollo");
  });

  it("detects Clay from enriched headers", () => {
    const headers = ["enriched", "person_linkedin_url", "person_name", "job_title", "job_company_name"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Clay");
  });

  it("returns Unknown for minimal generic headers", () => {
    const headers = ["company_name", "email", "phone"];
    const result = detectProvider(headers);
    expect(result.name).toBe("Unknown");
    expect(result.confidence).toBe(0);
  });

  it("returns Unknown for empty headers", () => {
    const result = detectProvider([]);
    expect(result.name).toBe("Unknown");
    expect(result.confidence).toBe(0);
  });
});

// ============================================
// matchTierToConfidence Tests
// ============================================

describe("matchTierToConfidence", () => {
  it("returns 100 for exact_canonical", () => {
    expect(matchTierToConfidence("exact_canonical")).toBe(100);
  });

  it("returns 85 for exact_alias", () => {
    expect(matchTierToConfidence("exact_alias")).toBe(85);
  });

  it("returns 0 for unresolved", () => {
    expect(matchTierToConfidence("unresolved")).toBe(0);
  });
});

// ============================================
// computeFieldConfidence Tests
// ============================================

describe("computeFieldConfidence", () => {
  it("returns confidence for all resolved fields", () => {
    const analysis = analyzeHeaders(["company_name", "email", "phone"]);
    const confidences = computeFieldConfidence(analysis);
    expect(confidences.length).toBe(3);

    const company = confidences.find((c) => c.canonicalField === "company_name");
    expect(company?.confidence).toBe(100);
    expect(company?.matchTier).toBe("exact_canonical");
  });

  it("returns 85 for alias-matched fields", () => {
    const analysis = analyzeHeaders(["Business", "email", "phone"]);
    const confidences = computeFieldConfidence(analysis);
    const company = confidences.find((c) => c.canonicalField === "company_name");
    expect(company?.confidence).toBe(85);
    expect(company?.matchTier).toBe("exact_alias");
  });

  it("includes sourceHeader in each entry", () => {
    const analysis = analyzeHeaders(["company_name", "Business Email"]);
    const confidences = computeFieldConfidence(analysis);

    const email = confidences.find((c) => c.canonicalField === "email");
    expect(email?.sourceHeader).toBe("Business Email");
  });

  it("skips unresolved fields", () => {
    const analysis = analyzeHeaders(["company_name", "totally_unknown"]);
    const confidences = computeFieldConfidence(analysis);
    const fields = confidences.map((c) => c.canonicalField);
    expect(fields).not.toContain("totally_unknown");
  });
});

// ============================================
// computeFieldQuality Tests
// ============================================

describe("computeFieldQuality", () => {
  it("calculates population percentages correctly", () => {
    const rows = [
      ["Acme Corp", "acme@test.com", "+15550100"],
      ["Other Corp", "", "+15550101"],
      ["Third Corp", "third@test.com", ""],
    ];
    const analysis = analyzeHeaders(["company_name", "email", "phone"]);
    const quality = computeFieldQuality(rows, ["company_name", "email", "phone"], analysis);

    const companyQ = quality.find((q) => q.canonicalField === "company_name");
    expect(companyQ?.populated).toBe(3);
    expect(companyQ?.total).toBe(3);
    expect(companyQ?.percentage).toBe(100);

    const emailQ = quality.find((q) => q.canonicalField === "email");
    expect(emailQ?.populated).toBe(2);
    expect(emailQ?.percentage).toBe(67);

    const phoneQ = quality.find((q) => q.canonicalField === "phone");
    expect(phoneQ?.populated).toBe(2);
    expect(phoneQ?.percentage).toBe(67);
  });

  it("treats spreadsheet error values as empty", () => {
    const rows = [
      ["Acme Corp", "#N/A", "NULL"],
    ];
    const analysis = analyzeHeaders(["company_name", "email", "phone"]);
    const quality = computeFieldQuality(rows, ["company_name", "email", "phone"], analysis);

    const companyQ = quality.find((q) => q.canonicalField === "company_name");
    expect(companyQ?.populated).toBe(1);

    const emailQ = quality.find((q) => q.canonicalField === "email");
    expect(emailQ?.populated).toBe(0);

    const phoneQ = quality.find((q) => q.canonicalField === "phone");
    expect(phoneQ?.populated).toBe(0);
  });

  it("returns empty array for no rows", () => {
    const analysis = analyzeHeaders(["company_name"]);
    const quality = computeFieldQuality([], ["company_name"], analysis);
    expect(quality).toEqual([]);
  });

  it("returns entries for recognition-only fields", () => {
    const rows = [
      ["Acme Corp", "New York"],
      ["Other Corp", ""],
    ];
    const analysis = analyzeHeaders(["company_name", "city"]);
    const quality = computeFieldQuality(rows, ["company_name", "city"], analysis);
    expect(quality.length).toBe(2);
    const cityQ = quality.find((q) => q.canonicalField === "city");
    expect(cityQ?.populated).toBe(1);
  });
});

// ============================================
// estimateImportSuccess Tests
// ============================================

describe("estimateImportSuccess", () => {
  it("returns 100% when all rows have company_name", () => {
    const rows = [["Acme Corp"], ["Other Corp"], ["Third Corp"]];
    const analysis = analyzeHeaders(["company_name"]);
    const result = estimateImportSuccess(rows, ["company_name"], analysis);
    expect(result).toBe(100);
  });

  it("returns 0% when no rows have company_name", () => {
    const rows = [[""], [""]];
    const analysis = analyzeHeaders(["company_name"]);
    const result = estimateImportSuccess(rows, ["company_name"], analysis);
    expect(result).toBe(0);
  });

  it("returns 50% for half populated", () => {
    const rows = [["Acme Corp"], [""], [""], ["Other Corp"]];
    const analysis = analyzeHeaders(["company_name"]);
    const result = estimateImportSuccess(rows, ["company_name"], analysis);
    expect(result).toBe(50);
  });

  it("returns 0 when company_name is not mapped", () => {
    const rows = [["acme@test.com"]];
    const analysis = analyzeHeaders(["email"]);
    const result = estimateImportSuccess(rows, ["email"], analysis);
    expect(result).toBe(0);
  });
});

// ============================================
// ImportAnalysis — new fields verification
// ============================================

describe("analyzeCsvFile — enriched fields", () => {
  it("includes provider detection", () => {
    const csv = "name,address,category,website,phone,rating,reviews,latitude,longitude\nAcme Corp,123 Main St,Restaurant,https://acme.com,+15550100,4.5,120,40.7128,-74.0060\n";
    const result = analyzeCsvFile(csv);
    expect(result.provider).toBeDefined();
    expect(result.provider.name).toBe("Google Maps");
    expect(result.provider.confidence).toBeGreaterThan(0);
  });

  it("computes estimatedSuccess from data rows", () => {
    const csv = "company_name,email\nAcme Corp,acme@test.com\nOther Corp,other@test.com\n,missing@test.com\n";
    const result = analyzeCsvFile(csv);
    expect(result.estimatedSuccess).toBe(67);
  });

  it("reports fieldQuality for all resolved fields", () => {
    const csv = "company_name,email,phone\nAcme Corp,acme@test.com,+15550100\nOther Corp,,+15550101\nThird Corp,third@test.com,\n";
    const result = analyzeCsvFile(csv);
    expect(result.fieldQuality.length).toBeGreaterThanOrEqual(3);

    const emailQ = result.fieldQuality.find((q) => q.canonicalField === "email");
    expect(emailQ?.populated).toBe(2);
    expect(emailQ?.total).toBe(3);
    expect(emailQ?.percentage).toBe(67);
  });

  it("reports requiredFieldCount and optionalFieldCount", () => {
    const csv = "company_name,email,phone\nAcme Corp,acme@test.com,+15550100\n";
    const result = analyzeCsvFile(csv);
    expect(result.requiredFieldCount).toBeGreaterThanOrEqual(1);
    expect(result.optionalFieldCount).toBeGreaterThanOrEqual(0);
    expect(result.ignoredFieldCount).toBe(0);
  });

  it("reports ignoredFieldCount for unmapped columns", () => {
    const csv = "company_name,email,RandomColumn1,RandomColumn2\nAcme Corp,acme@test.com,x,y\n";
    const result = analyzeCsvFile(csv);
    expect(result.ignoredFieldCount).toBe(2);
  });
});

// ============================================
// ImportResult — new fields verification
// ============================================

describe("importCsv — enriched result", () => {
  it("includes elapsedMs", async () => {
    const csv = "company_name\nAcme Corp\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("includes fieldExtraction counts", async () => {
    const csv = "company_name,email\nAcme Corp,acme@test.com\nOther Corp,other@test.com\nThird Corp,\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.fieldExtraction).toBeDefined();
    expect(result.fieldExtraction.company_name).toBe(3);
    expect(result.fieldExtraction.email).toBe(2);
  });

  it("includes ignoredFieldCount", async () => {
    const csv = "company_name,random_col\nAcme Corp,x\n";
    const mockAdmin = { from: () => ({ insert: () => Promise.resolve({ error: null }) }) };
    const result = await importCsv(csv, mockAdmin as any, "admin-uuid");
    expect(result.ignoredFieldCount).toBe(1);
  });
});
