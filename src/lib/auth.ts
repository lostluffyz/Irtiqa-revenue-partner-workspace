// ============================================
// Authentication Utilities
// ============================================
//
// Company ID normalization and synthetic email mapping
// for Revenue Partners using Supabase Auth.
//
// Mapping: companyId → {companyId_lowercase}@rp.irtiqa.internal
// Example:  "RP-1001" → "rp-1001@rp.irtiqa.internal"
//
// The internal domain is a reserved, non-routable domain.
// No emails are ever sent to this address.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import {
  getPartnerAuthEmail,
  extractCompanyIdFromEmail,
} from "@/lib/system-accounts";

/**
 * The minimum length for Company IDs used in validation.
 * Company IDs are admin-generated (e.g., "RP-1001").
 */
export const COMPANY_ID_MIN_LENGTH = 3;

/**
 * The maximum length for Company IDs.
 */
export const COMPANY_ID_MAX_LENGTH = 32;

/**
 * Normalize a Company ID to its canonical form.
 * - Trims whitespace
 * - Converts to uppercase (canonical display form)
 */
export function normalizeCompanyId(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Convert a Company ID to the synthetic auth email.
 * This is what gets passed to Supabase Auth's signInWithPassword.
 *
 * The email is always lowercase for case-insensitive auth matching.
 */
export function toAuthEmail(companyId: string): string {
  return getPartnerAuthEmail(companyId);
}

/**
 * Check if a Company ID format is valid.
 * Must match the pattern of admin-created IDs (alphanumeric + hyphens/underscores).
 */
export function isValidCompanyId(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < COMPANY_ID_MIN_LENGTH) return false;
  if (trimmed.length > COMPANY_ID_MAX_LENGTH) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Extract a human-readable Company ID from an auth email.
 * Reverses the `toAuthEmail` mapping.
 * Returns null if the email doesn't match the partner domain.
 */
export function fromAuthEmail(email: string): string | null {
  return extractCompanyIdFromEmail(email);
}

/**
 * Sign in a Revenue Partner using Company ID + password.
 */
export async function signInWithCompanyId(
  supabase: SupabaseClient,
  companyId: string,
  password: string,
) {
  const email = toAuthEmail(companyId);
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign in an Admin using email + password.
 */
export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Get the current authenticated user's profile.
 */
export async function getProfile(
  supabase: SupabaseClient,
): Promise<{ profile: Profile | null; error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { profile: null, error: "Not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { profile: null, error: "Profile not found" };
  }

  return { profile: profile as unknown as Profile, error: null };
}
