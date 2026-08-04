import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase Admin Client
 *
 * Uses the SUPABASE_SECRET_KEY which bypasses RLS.
 * This module MUST NEVER be imported in client components or API route handlers
 * that are exposed to the public.
 *
 * Only use in:
 * - Server Actions (co-located with authorization checks)
 * - Seed/bootstrap scripts
 * - Cron jobs / background tasks
 *
 * Runtime guard: throws if accidentally imported on the client.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "admin.ts (Supabase Admin Client) cannot be imported from client code. " +
      "It contains the SUPABASE_SECRET_KEY which must remain server-only.",
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseSecretKey) {
  throw new Error(
    "Missing env.SUPABASE_SECRET_KEY — required for admin operations",
  );
}

export const adminClient = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
