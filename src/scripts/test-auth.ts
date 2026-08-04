// ============================================
// Hosted Authentication Acceptance Test
// ============================================
//
// Tests authentication against the hosted Supabase project.
// Uses the publishable (anon) key — just like the browser would.
//
// Usage:
//   npx tsx src/scripts/test-auth.ts
//
// This tests:
//   - Admin email/password login
//   - Partner company_id-based lookup then email login
//   - Invalid credentials (rejected)
//   - Role gating on JWT claims
//
// ============================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const PASS = " ✅ PASS";
const FAIL = " ❌ FAIL";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  if (!URL || !ANON_KEY || !SECRET_KEY) {
    console.error("ERROR: Missing Supabase env vars. Check .env.local.");
    process.exit(1);
  }

  console.log("=== HOSTED AUTHENTICATION ACCEPTANCE TEST ===");
  console.log(`Target: ${URL}`);
  console.log("");

  // --------------- Test 1: Admin login ---------------
  console.log("--- Admin Email/Password Login ---");

  const adminClient = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@irtiqa.ai";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ERROR: ADMIN_PASSWORD is not set.");
    console.error("  Set ADMIN_PASSWORD in .env.local or as a Vercel Environment Variable.");
    process.exit(1);
  }

  const { data: adminSession, error: adminErr } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  check("Admin login succeeds", !adminErr && !!adminSession.session, adminErr?.message);
  check("Admin JWT contains role=admin", adminSession.user?.user_metadata?.role === "admin",
    `got role=${adminSession.user?.user_metadata?.role}`);

  if (adminSession.session) {
    // Decode the JWT to verify user_metadata.role
    const claims = JSON.parse(atob(adminSession.session.access_token.split(".")[1]));
    check("Admin JWT user_metadata.role=admin",
      claims.user_metadata?.role === "admin",
      `user_metadata.role=${claims.user_metadata?.role}`);

    // Test is_admin() database function by calling it via RPC
    const { data: isAdmin, error: rpcErr } = await adminClient.rpc("is_admin");
    check("is_admin() RPC returns true", !rpcErr && isAdmin === true,
      rpcErr?.message || `is_admin returned ${isAdmin}`);
    await adminClient.auth.signOut();
  }
  console.log("");

  // --------------- Test 2: Partner Company ID login ---------------
  console.log("--- Partner Company ID Normalization & Login ---");

  const partnerEmail = "qa-test-001@rp.irtiqa.internal";
  const partnerPassword = process.env.QA_PARTNER_PASSWORD || "THunkBROPH0xGplS";

  // Step 1: Lookup partner by company_id
  const adminSupabase = createClient(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: partnerRecord, error: partnerLookupErr } = await adminSupabase
    .from("partners")
    .select("id, company_id, status")
    .eq("company_id", "QA-TEST-001")
    .maybeSingle();

  check("Partner lookup by company_id succeeds", !partnerLookupErr && !!partnerRecord,
    partnerLookupErr?.message || "no record found");
  check("Partner status is active", partnerRecord?.status === "active",
    `status=${partnerRecord?.status}`);

  // Step 2: Login with the partner email
  const partnerClient = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: partnerSession, error: partnerErr } = await partnerClient.auth.signInWithPassword({
    email: partnerEmail,
    password: partnerPassword,
  });

  check("Partner login succeeds", !partnerErr && !!partnerSession.session, partnerErr?.message);
  check("Partner JWT contains role=partner",
    partnerSession.user?.user_metadata?.role === "partner",
    `got role=${partnerSession.user?.user_metadata?.role}`);

  if (partnerSession.session) {
    const claims = JSON.parse(atob(partnerSession.session.access_token.split(".")[1]));
    check("Partner JWT has correct aud",
      claims.aud === "authenticated",
      `aud=${claims.aud}`);
    await partnerClient.auth.signOut();
  }
  console.log("");

  // --------------- Test 3: Invalid credentials rejected ---------------
  console.log("--- Invalid Credential Rejection ---");

  const badClient = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: badEmailErr } = await badClient.auth.signInWithPassword({
    email: "nonexistent@test.com",
    password: "SomePassword123!",
  });
  check("Invalid email/password rejected", !!badEmailErr,
    badEmailErr?.message || "should have been rejected");

  const { error: badPasswordErr } = await badClient.auth.signInWithPassword({
    email: partnerEmail,
    password: "WrongPassword!",
  });
  check("Valid email + wrong password rejected", !!badPasswordErr,
    badPasswordErr?.message || "should have been rejected");

  const { error: emptyErr } = await badClient.auth.signInWithPassword({
    email: "",
    password: "",
  });
  check("Empty credentials rejected", !!emptyErr);
  console.log("");

  // --------------- Summary ---------------
  console.log("=== RESULTS ===");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log("");

  if (failed > 0) {
    console.log("WARNING: Some authentication tests failed.");
    process.exit(1);
  } else {
    console.log("All authentication acceptance tests PASSED.");
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
