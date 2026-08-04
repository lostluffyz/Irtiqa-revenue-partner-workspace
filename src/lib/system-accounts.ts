// ============================================
// System Accounts — Single Source of Truth
// ============================================
//
// This module is the ONLY location for:
//   - Protected accounts (cannot be deleted)
//   - System emails and domains
//   - Reserved identifiers
//
// All other modules import from here.
// No email-domain checks. No magic strings. No duplicated logic.

/**
 * Partner email domain for Supabase Auth.
 * All partner accounts use synthetic emails:
 *   {company_id_lowercase}@rp.irtiqa.internal
 *
 * This is a reserved, non-routable domain.
 * No emails are ever sent to this address.
 */
export const PARTNER_EMAIL_DOMAIN = "rp.irtiqa.internal" as const;

/**
 * Protected account emails that can NEVER be deleted through the UI.
 * These are system-critical accounts (root admins, service accounts, etc.).
 *
 * To add a new protected account, add its email here.
 * This is the ONLY place to manage protected accounts.
 */
export const PROTECTED_ACCOUNTS: ReadonlySet<string> = new Set([
  // Root administrator
  // Configurable via ADMIN_EMAIL env var in seed-admin.ts
  "admin@irtiqa.ai",
]);

/**
 * Check if an email belongs to a protected/system account.
 * Protected accounts cannot be deleted or modified in destructive ways.
 *
 * Uses exact match against the PROTECTED_ACCOUNTS set.
 * No email-domain checks — only explicitly listed accounts are protected.
 */
export function isProtectedAccount(email: string): boolean {
  return PROTECTED_ACCOUNTS.has(email);
}

/**
 * Generate the synthetic auth email for a partner from their Company ID.
 *
 * Example:
 *   getPartnerAuthEmail("RP-1001") → "rp-1001@rp.irtiqa.internal"
 *   getPartnerAuthEmail("QA-TEST-001") → "qa-test-001@rp.irtiqa.internal"
 *
 * The email is always lowercase for case-insensitive auth matching.
 */
export function getPartnerAuthEmail(companyId: string): string {
  return `${companyId.trim().toLowerCase()}@${PARTNER_EMAIL_DOMAIN}`;
}

/**
 * Extract the Company ID from a partner's synthetic auth email.
 * Reverses the getPartnerAuthEmail() mapping.
 *
 * Returns null if the email doesn't belong to the partner domain.
 *
 * Example:
 *   extractCompanyIdFromEmail("rp-1001@rp.irtiqa.internal") → "RP-1001"
 *   extractCompanyIdFromEmail("admin@irtiqa.ai") → null
 */
export function extractCompanyIdFromEmail(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  if (parts[1] !== PARTNER_EMAIL_DOMAIN) return null;
  return parts[0].toUpperCase();
}

/**
 * QA test partner company ID.
 * Used by seed-qa.ts and cleanup-demo-data.ts.
 */
export const QA_TEST_COMPANY_ID = "QA-TEST-001" as const;
