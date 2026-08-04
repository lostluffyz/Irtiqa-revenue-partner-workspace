// ============================================
// Create Partner Password Regression Test
// ============================================
//
// Tests that an auto-generated password from the create-partner flow
// can be used to authenticate on the partner login path.
//
// This reproduces the scenario from the manual acceptance test where
// the initial temporary password from the success screen was rejected
// as "Invalid login credentials", but an admin password reset worked.
//
// Usage:
//   npx tsx src/scripts/test-partner-password.ts
//
// Prerequisites:
//   1. .env.local populated with Supabase keys
//   2. Admin user exists (seed-admin.ts run)
//   3. A test region UUID is available (North America from migration 001)
//
// Security:
//   - Uses SUPABASE_SECRET_KEY — server-side only
//   - Test partner is cleaned up after test completes
//   - Password is never printed to console
//   ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { randomBytes } from "crypto";

config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// North America region UUID (from migration 001 seed data)
const QA_REGION_ID = "c0283333-8f9d-43a7-80eb-21e55179fa48";

let passed = 0;
let failed = 0;

function result(label: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); }
}

function generateTemporaryPassword(length = 16): string {
  return randomBytes(length)
    .toString("base64")
    .replace(/[^a-zA-Z0-9!@#$%^&*]/g, "")
    .slice(0, length);
}

// ============================================
// SECTION 1: Password Generation Analysis
// ============================================
function testPasswordGeneration() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 1: Password Generation Analysis");
  console.log("═══════════════════════════════════");

  let allLengthsValid = true;
  let allCharsetsValid = true;
  let allAscii = true;

  for (let i = 0; i < 100; i++) {
    const pwd = generateTemporaryPassword();
    if (pwd.length !== 16) allLengthsValid = false;
    if (!/^[a-zA-Z0-9!@#$%^&*]+$/.test(pwd)) allCharsetsValid = false;
    if ([...pwd].some(c => c.charCodeAt(0) > 127)) allAscii = false;
  }

  result("All passwords have length 16", allLengthsValid);
  result("All passwords use valid charset (A-Z, a-z, 0-9, !@#$%^&*)", allCharsetsValid);
  result("All passwords are pure ASCII", allAscii);
}

// ============================================
// SECTION 2: Full Create-and-Login Flow Test
// ============================================
async function testCreateAndLoginFlow(supabase: SupabaseClient) {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 2: Create-and-Login Flow (x3 iterations)");
  console.log("═══════════════════════════════════");

  const ITERATIONS = 3;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    console.log(`\n  --- Iteration ${iter + 1} ---`);

    // Generate Company ID
    const { data: companyId } = await supabase.rpc("generate_company_id") as { data: string | null };
    if (!companyId || typeof companyId !== "string") {
      result("Generate Company ID", false, "failed");
      return;
    }
    result("Company ID generated", /^RP-\d+$/.test(companyId));

    // 1. Generate password (same flow as createPartner())
    const password = generateTemporaryPassword();
    result("Password generated", password.length === 16);

    // 2. Create auth user (same as createPartner step 3)
    const authEmail = `${companyId.toLowerCase()}@rp.irtiqa.internal`;

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Password Test Partner",
        role: "partner",
      },
    });

    if (createError || !authUser.user) {
      result("Auth user creation", false, createError?.message || "no user");
      return;
    }
    result("Auth user created", true);
    const userId = authUser.user.id;

    // 3. Create profile
    await (supabase.from("profiles") as any).upsert({
      id: userId,
      email: authEmail,
      full_name: "Password Test Partner",
      role: "partner",
      is_active: true,
    }, { onConflict: "id" });

    // 4. Create partner record
    await (supabase.from("partners") as any).insert({
      id: userId,
      company_id: companyId,
      region_id: QA_REGION_ID,
      phone: null,
      status: "active",
      program_start_date: "2026-07-14",
    });

    // ===================================================================
    // CRITICAL: Login using the SAME password returned from createPartner()
    // ===================================================================
    // Use a fresh client with publishable key (no admin privileges)
    const loginClient = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: loginError } = await loginClient.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    result("Login with initial password succeeds", !loginError, loginError?.message);

    // If login failed, test password-reset path (like admin did)
    if (loginError) {
      const resetPwd = generateTemporaryPassword();
      await supabase.auth.admin.updateUserById(userId, { password: resetPwd });

      const resetClient = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: resetLoginError } = await resetClient.auth.signInWithPassword({
        email: authEmail,
        password: resetPwd,
      });
      result("Login after admin password reset succeeds", !resetLoginError, resetLoginError?.message);
    }

    // Cleanup
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
  }
}

// ============================================
// SECTION 3: Compare createUser vs updateUserById
// ============================================
async function testPasswordConsistency(supabase: SupabaseClient) {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 3: createUser vs updateUserById Password Comparison");
  console.log("═══════════════════════════════════");

  // Create a test user with a known password
  const { data: companyId } = await supabase.rpc("generate_company_id") as { data: string | null };
  if (!companyId || typeof companyId !== "string") return;

  const password = generateTemporaryPassword();
  const authEmail = `${companyId.toLowerCase()}@rp.irtiqa.internal`;

  const { data: authUser } = await supabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Password Test", role: "partner" },
  });
  if (!authUser?.user) { result("Setup: createUser", false); return; }
  result("Setup: test user created", true);

  const userId = authUser.user.id;

  // Create profile + partner
  await (supabase.from("profiles") as any).upsert({
    id: userId, email: authEmail, full_name: "Password Test",
    role: "partner", is_active: true,
  }, { onConflict: "id" });
  await (supabase.from("partners") as any).insert({
    id: userId, company_id: companyId, region_id: QA_REGION_ID,
    phone: null, status: "active", program_start_date: "2026-07-14",
  });

  // Test: login with initial password
  const c = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: e1 } = await c.auth.signInWithPassword({ email: authEmail, password });
  result("Initial password (createUser) authenticates", !e1, e1?.message);

  // Reset password via updateUserById
  const resetPwd = generateTemporaryPassword();
  await supabase.auth.admin.updateUserById(userId, { password: resetPwd });

  const c2 = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: e2 } = await c2.auth.signInWithPassword({ email: authEmail, password: resetPwd });
  result("Reset password (updateUserById) authenticates", !e2, e2?.message);

  // Old password should no longer work
  const c3 = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: e3 } = await c3.auth.signInWithPassword({ email: authEmail, password });
  result("Initial password correctly invalidated after reset", !!e3, e3?.message || "was still accepted");

  // Cleanup
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
  result("Cleanup complete", true);
}

// ============================================
// SUMMARY
// ============================================
function printSummary() {
  const total = passed + failed;
  console.log("\n═══════════════════════════════════");
  console.log("PASSWORD REGRESSION TEST SUMMARY");
  console.log("═══════════════════════════════════");
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${total}`);
  console.log("");

  if (failed === 0) {
    console.log("  ✅ ALL CHECKS PASSED");
  } else {
    console.log(`  ❌ ${failed} CHECK(S) FAILED`);
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error("ERROR: Missing Supabase environment variables (.env.local)");
    process.exit(1);
  }

  console.log("═══════════════════════════════════");
  console.log("CREATE PARTNER PASSWORD REGRESSION TEST");
  console.log(`Target: ${SUPABASE_URL}`);
  console.log("");

  testPasswordGeneration();

  const supabase = createClient(SUPABASE_URL!, SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await testCreateAndLoginFlow(supabase);
  await testPasswordConsistency(supabase);
  printSummary();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err.message);
  process.exit(1);
});
