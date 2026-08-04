# Adaptive CSV Import

**Date:** 2026-07-16
**Status:** ✅ Implemented and tested

---

## Overview

The adaptive CSV import system replaces the previous strict CSV upload with a flexible, tolerant import that handles real-world CSV variations from dozens of lead-generation providers (Google Maps, Apify, Outscraper, BrightData, Clay, Apollo, ZoomInfo, LinkedIn, Crunchbase, etc.). It uses **deterministic white-list mapping** — no fuzzy matching, no LLM invocation, no silent guessing.

## Architecture

```
CSV text → parseCsvText() → analyzeHeaders() → resolveColumnTypes() → buildCanonicalRows() → batch insert
                                   ↓              ↓
                             URL classifier   Confidence-based
                             (value sampling)  auto-resolution
                                   ↓
                          Preview/analysis (no DB writes)
```

### Core Modules

| Module | File | Purpose |
|---|---|---|
| **Header Normalization** | `src/lib/csv/header-normalization.ts` | Trim → replace `_` `-` with space → collapse spaces → lowercase → NFKC |
| **Alias Registry** | `src/lib/csv/alias-registry.ts` | 15 canonical field definitions (7 stored + 8 recognition-only) with comprehensive aliases |
| **Header Mapper** | `src/lib/csv/header-mapper.ts` | Deterministic header → canonical field mapping with confidence-based auto-resolution and URL reclassification |
| **URL Classifier** | `src/lib/csv/url-classifier.ts` | Value-based URL classification (Google Maps, LinkedIn, Facebook, generic website, source) |
| **Row Builder** | `src/lib/csv/row-builder.ts` | Canonical row construction with explicit allowlist, validation, and spreadsheet error normalization |
| **Import Engine** | `src/lib/csv/import-engine.ts` | Full orchestration: parse → analyze → classify → build → batch insert |

### Integration

| File | Purpose |
|---|---|
| `src/app/(dashboard)/admin/leads/actions.ts` | Server actions: `previewCsvAction` + `uploadCsvAction` (uses import engine) |
| `src/app/(dashboard)/admin/leads/upload/page.tsx` | Upload UI: file selection → canonical preview → confirm import |

## Canonical Fields (15 total: 7 stored + 8 recognition-only)

### Stored Fields (inserted into database)

| Field | Required | Aliases (examples) |
|---|---|---|
| `company_name` | ✅ Yes | company, business, organization, org, store, firm, name, title, vendor, merchant, brand, enterprise, restaurant_name, practice_name, school_name, hotel_name, etc. |
| `website` | ❌ No | website_url, url, domain, company_url, web_address, site, homepage, website_link |
| `phone` | ❌ No | phone_number, mobile, telephone, contact_number, phone_1, tel, cell |
| `email` | ❌ No | email_address, business_email, work_email, e-mail, email_1, mail |
| `industry` | ❌ No | category, niche, vertical, sector, business_type, classification |
| `country` | ❌ No | country_name, nation, country_code, region |
| `internal_notes` | ❌ No | notes, comment, comments, description, remarks |

### Recognition-Only Fields (shown in preview, excluded from DB inserts)

| Field | Aliases (examples) |
|---|---|
| `city` | city_name, town, locality, municipality, metro_area |
| `state` | province, territory, administrative_area, state_code |
| `postal_code` | zip, zip_code, zipcode, postcode, pin_code |
| `address` | full_address, street, street_address, address_line, formatted_address |
| `google_maps_url` | maps_url, gmaps, google_maps_link, place_url, maps_link |
| `linkedin_url` | linkedin, linkedin_link, linkedin_profile, linkedin_company |
| `facebook_url` | facebook, facebook_link, facebook_page, fb |
| `source_url` | source_link, scrape_url, export_url, listing_url, profile_url |

## Mapping Algorithm

The mapping uses a 3-tier evidence hierarchy:

1. **Exact canonical match** (confidence: 3) — The normalized header equals the canonical key's normalized form (e.g., `company_name` → normalized `company name` → canonical `company_name`)
2. **Exact alias match** (confidence: 2) — The normalized header matches a known alias in the registry
3. **Unresolved** (confidence: 1) — No match found; column is treated as supplemental/ignored

### Confidence-Based Auto-Resolution

When multiple columns map to the same canonical field with **different confidence tiers**, the highest-confidence mapping is selected automatically — no admin intervention needed.

Examples:
- `company_name` (exact_canonical) + `Business` (exact_alias) → `company_name` wins → resolved
- `Company` (exact_alias) + `Business` (exact_alias) → both same tier → **ambiguous** (blocked)

### Ambiguity Detection

If two (or more) source columns map to the same canonical field at the **same confidence tier**, the import is blocked. The admin must resolve ambiguity by choosing which source column to use. This is surfaced in the preview step with a dropdown selector.

## URL Classification

The URL classifier inspects actual cell values (not column headers) to distinguish between URL types. It uses pattern matching only — no network requests.

### Classification Rules

| Type | Domain/Path Pattern |
|---|---|
| Google Maps | `maps.google.com/*`, `goo.gl/maps/*`, `google.com/maps*`, `google.com/travel*` |
| LinkedIn | `linkedin.com/company/*`, `linkedin.com/in/*`, `linkedin.com/school/*` |
| Facebook | `facebook.com/*`, `fb.com/*`, `m.facebook.com/*` |
| Generic Website | Any valid URL not matching above categories |
| Source URL | Unresolved columns with URL values (fallback) |

### Flow in Import Engine

1. Headers are initially mapped via the alias registry
2. Columns mapped to `website` via alias (e.g., `url`) are sampled for URL type
3. Unresolved columns with URL-looking values are classified
4. If ≥50% of sample values match a type, the column is reclassified
5. The full analysis is rebuilt from the adjusted mappings

## Spreadsheet Error Normalization

The row builder normalizes common spreadsheet error/null values to empty string (which becomes `null` in the database):

- **Formulas errors**: `#ERROR!`, `#VALUE!`, `#REF!`, `#N/A`, `#NAME?`, `#DIV/0!`, `#NULL!`, `#NUM!`
- **Null literals**: `NULL`, `null`, `N/A`, `n/a`, `NA`, `na`, `N/A`, `-`, `--`, `---`
- **Missing value markers**: `Unknown`, `unknown`, `UNKNOWN`, `None`, `none`, `NONE`, `Not Available`, `NULL_VALUE`, `EMPTY`, `BLANK`, `undefined`, `UNDEFINED`

## Security Model

- **No raw CSV row spread** — The insert object is constructed explicitly from allowlisted fields only
- **Authorization** — Server actions call `requireAdmin()` before any operation
- **Admin client** — All DB writes use the admin Supabase client (bypasses RLS)
- **Invariant fields** — `status = "not_contacted"` and `created_by = admin UUID` are set by the engine, never from CSV
- **No fuzzy/LLM matching** — All mapping is deterministic via the alias registry
- **Recognition-only fields** — Fields like `city`, `state`, `address`, URL types are recognized in preview but silently excluded from database inserts

### Protected Fields

The following database columns can NEVER be set via CSV. They are enforced by the row builder's explicit allowlist:

`id`, `assigned_to`, `assigned_at`, `created_at`, `created_by`, `updated_at`, `status`, `is_active`, `role`, `password`, `auth_user_id`, `is_admin`, `owner_id`, `assigned_partner_id`

## Value Normalization

| Category | Rule |
|---|---|
| All fields | Trim whitespace, spreadsheet error/null → empty (→ `null`) |
| `email` | Lowercased for consistent matching |
| `phone` | Preserved as-is (including `+`, leading zeros, spaces) |
| `website` | Trimmed only |
| `company_name` | Trimmed; required, ≤500 chars |
| `all other stored fields` | Trimmed only |

## Upload Limits

- File size: 5MB maximum
- Rows: 5,000 maximum
- Batch size: 100 rows per insert

## Upload Flow

1. **Select file** — User chooses a `.csv` file
2. **Preview** — File is analyzed client-side and sent to `previewCsvAction`
   - **Canonical import preview** — Shows how CSV data maps to lead fields (company_name, website, phone, email, industry, country, notes)
   - **Recognition-only fields** — Badged as "recognized" (city, state, address, URL types)
   - **Collapsed ignored columns** — "N additional columns ignored" expandable `<details>` section (prevents overwhelming UI with 30-150 scraper columns)
   - **Detailed mapping** — Expandable section with per-column mapping analysis
   - Missing required fields shown as errors
   - Ambiguous fields shown with resolution dropdowns (same-tier ambiguity only)
3. **Confirm import** — Full file sent to `uploadCsvAction` with ambiguity resolutions
4. **Results** — Success/error display with per-row error details

## Test Coverage

153 tests covering:

- Header normalization (9 tests)
- Alias registry (26 tests including new fields, camelCase, British spelling)
- Header mapping (12 tests including name, title, firm, city, google maps url)
- Ambiguity detection with confidence resolution (5 tests: auto-resolve, same-tier blocked)
- Extra column tolerance (3 tests including 100+ columns)
- Value normalization with spreadsheet errors (22 tests including #N/A, #ERROR!, NULL, N/A, NA, dash, Unknown, None, undefined)
- Required field validation (3 tests)
- Protected field injection protection (12 tests including owner_id, city, google_maps_url)
- Alias equivalence (2 tests)
- URL classification (12 tests: Google Maps, LinkedIn, Facebook, generic website, unknown, travel, school)
- URL column classification (5 tests: reclassification, generic website, unresolved)
- ResolveColumnTypes integration (3 tests)
- CSV parsing (8 tests including UTF-8, CRLF, quoted values, empty values)
- Import engine analysis (7 tests including Apify-style, Google Maps-style, auto-resolution)
- Import engine execution (8 tests including reordered columns, scraper-style, spreadsheet null values, unknown columns)
- Canonical field structure (2 tests: company_name required, 15 total fields)
- Reordered columns (1 test)
- Malformed CSV edge cases (2 tests)

## Provider Compatibility

The import system handles CSV exports from these providers without manual editing:

- **Google Maps** — `name`, `address`, `category`, `website`, `phone`, `rating`, `reviews`
- **Apify** — `title`, `url`, `phone`, `email`, `city`, `state`, `zipCode`, `address`, `linkedInUrl`, `sourceUrl`
- **Outscraper** — Various scraped fields with spreadsheet error values
- **BrightData** — Scraper-style exports with many supplemental columns
- **LinkedIn Sales Navigator** — Exported lead lists
- **Apollo / ZoomInfo / Crunchbase** — Lead exports with standard business fields
- **Google Sheets / Excel** — Exports with formula errors (#N/A, #ERROR!, etc.)
- **Clay** — Enriched lead exports with URL fields

## Files

| Action | File |
|---|---|
| ✅ Created | `src/lib/csv/header-normalization.ts` |
| ✅ Created | `src/lib/csv/alias-registry.ts` |
| ✅ Created | `src/lib/csv/header-mapper.ts` |
| ✅ Created | `src/lib/csv/url-classifier.ts` |
| ✅ Created | `src/lib/csv/row-builder.ts` |
| ✅ Created | `src/lib/csv/import-engine.ts` |
| ✅ Created | `src/lib/csv/import-engine.test.ts` (153 tests) |
| ✅ Modified | `src/app/(dashboard)/admin/leads/actions.ts` |
| ✅ Modified | `src/app/(dashboard)/admin/leads/upload/page.tsx` |
| ✅ Verified | `npx tsc --noEmit` — 0 errors |
| ✅ Verified | `npx vitest run` — all tests pass |
