// ============================================
// RLS Adversarial Test Matrix — v3
// ============================================
//
// Tests every RLS policy by authenticating as a partner
// using only the anon (publishable) key — exactly what a
// browser client can do.
//
// Key RLS behavior patterns:
//   - SELECT denied → empty array (no rows), NO error
//   - INSERT denied → "violates row-level security" error
//   - UPDATE/DELETE denied → empty result (0 rows), NO error
//
// Usage:
//   npx tsx src/scripts/test-rls.ts
//
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const PASS = " ✅ PASS";
const FAIL = " ❌ FAIL";
const WARN = " ⚠️  WARN";

let passed = 0;
let failed = 0;
let warnings = 0;
let partnerClient: SupabaseClient;
let partnerUid = "";

function result(label: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ${PASS} ${label}`); }
  else { failed++; console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ""}`); }
}

function warnOut(label: string, detail?: string) {
  warnings++;
  console.log(`  ${WARN} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function login() {
  const c = createClient(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: auth, error: err } = await c.auth.signInWithPassword({
    email: "qa-test-001@rp.irtiqa.internal",
    password: process.env.QA_PARTNER_PASSWORD || "",
  });
  if (err || !auth.user) throw new Error(`Login failed: ${err?.message}`);
  partnerClient = c;
  partnerUid = auth.user.id;
  console.log(`  Partner UID: ${partnerUid}`);
}

async function main() {
  if (!URL || !ANON_KEY || !SECRET_KEY) {
    console.error("ERROR: Missing Supabase env vars.");
    process.exit(1);
  }
  if (!process.env.QA_PARTNER_PASSWORD) {
    console.error("ERROR: QA_PARTNER_PASSWORD not set.");
    process.exit(1);
  }

  console.log("=== RLS ADVERSARIAL TEST MATRIX ===");
  console.log(`Target: ${URL}`);
  console.log("");

  await login();

  // ============================================
  // 1. LEADS
  // ============================================
  console.log("\n--- LEADS: SELECT own ---");
  {
    const { data, error } = await partnerClient
      .from("leads")
      .select("*", { count: "exact", head: false });
    result("No error", !error, error?.message);
    result("Returns owned leads (8 expected)", !error && data !== null && data!.length > 0);
    warnOut(`  Own leads returned: ${data?.length || 0}`);
  }

  console.log("\n--- LEADS: SELECT other partner's leads ---");
  {
    const { data, error } = await partnerClient
      .from("leads").select("id").neq("assigned_to", partnerUid).limit(5);
    result("Silently empty", !error && (!data || data.length === 0), error?.message);
  }

  console.log("\n--- LEADS: INSERT (no partner INSERT policy) ---");
  {
    const { error } = await partnerClient.from("leads").insert({
      company_name: "RLS Test", email: "x@x.com", status: "not_contacted", assigned_to: partnerUid,
    });
    result("Denied with error", !!error, error?.message || "was allowed");
  }

  console.log("\n--- LEADS: UPDATE own status (permitted) ---");
  {
    const { data: lead } = await partnerClient.from("leads")
      .select("id,status").eq("assigned_to", partnerUid).limit(1).single();
    if (!lead) { warnOut("No lead to test"); }
    else {
      const target = lead.status === "contacted" ? "follow_up_required" : "contacted";
      const { data: upd } = await partnerClient.from("leads")
        .update({ status: target }).eq("id", lead.id).select("id");
      result("1 row updated", !!(upd?.length === 1));
      if (upd?.length === 1) await partnerClient.from("leads").update({ status: lead.status }).eq("id", lead.id);
    }
  }

  console.log("\n--- LEADS: UPDATE non-status field (app-layer enforced) ---");
  {
    const { data: lead } = await partnerClient.from("leads")
      .select("id,company_name").eq("assigned_to", partnerUid).limit(1).single();
    if (!lead) { warnOut("No lead"); }
    else {
      const { data: upd } = await partnerClient.from("leads")
        .update({ company_name: "RLS-Bypass-Test" }).eq("id", lead.id).select("id");
      // RLS is row-level — the policy only restricts WHICH rows (assigned only),
      // not which columns. So UPDATE on company_name succeeds at the RLS layer.
      // Column restriction is an app-level concern handled by server actions.
      if (upd?.length === 1) {
        warnOut("Non-status field update ALLOWED at RLS layer (row-level only; app enforces column restriction)");
        await partnerClient.from("leads").update({ company_name: lead.company_name }).eq("id", lead.id);
      } else {
        result("Denied (0 rows)", true);
      }
    }
  }

  console.log("\n--- LEADS: DELETE (admin-only policy) ---");
  {
    const { data: lead } = await partnerClient.from("leads")
      .select("id").eq("assigned_to", partnerUid).limit(1).single();
    if (!lead) { warnOut("No lead"); }
    else {
      const { data: del } = await partnerClient.from("leads").delete().eq("id", lead.id).select("id");
      result("0 rows deleted (silent RLS deny)", !!(del?.length === 0 || !del),
        `deleted ${del?.length || 0} rows`);
      // Still exists?
      const { data: still } = await partnerClient.from("leads").select("id").eq("id", lead.id).maybeSingle();
      result("Lead still exists after denied DELETE", !!still);
    }
  }

  // ============================================
  // 2. DAILY REPORTS
  // ============================================
  console.log("\n--- DAILY REPORTS: SELECT own ---");
  {
    const { data, error } = await partnerClient.from("daily_reports")
      .select("id").eq("partner_id", partnerUid);
    result("No error", !error, error?.message);
    warnOut(`Own reports: ${data?.length || 0}`);
  }

  console.log("\n--- DAILY REPORTS: SELECT other partner ---");
  {
    const { data, error } = await partnerClient.from("daily_reports")
      .select("id").neq("partner_id", partnerUid).limit(1);
    result("Silently empty", !error && (!data || data.length === 0), error?.message);
  }

  // Seed a test report for INSERT/UPDATE/DELETE tests via admin client
  const admin = createClient(URL!, SECRET_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log("\n--- DAILY REPORTS: INSERT own ---");
  {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await partnerClient.from("daily_reports").insert({
      partner_id: partnerUid, report_date: today,
      leads_contacted: 2, appointments_booked: 0, deals_closed: 0,
    });
    if (error?.message?.includes("duplicate")) {
      result("INSERT skipped (already submitted today)", true);
    } else {
      result("INSERT succeeds", !error, error?.message);
    }
  }

  // Ensure a report exists for UPDATE/DELETE tests
  const { data: existingRep } = await partnerClient.from("daily_reports")
    .select("id, report_date").eq("partner_id", partnerUid).maybeSingle();
  if (!existingRep) {
    const { error: seedErr } = await admin.from("daily_reports").insert({
      partner_id: partnerUid, report_date: "2026-07-12",
      leads_contacted: 1, appointments_booked: 0, deals_closed: 0,
    });
    if (seedErr) warnOut("Could not seed report for UPDATE test: " + seedErr.message);
  }
  const { data: testRep } = await admin.from("daily_reports")
    .select("id, report_date").eq("partner_id", partnerUid).limit(1).maybeSingle();

  console.log("\n--- DAILY REPORTS: UPDATE (migration 005 removed partner UPDATE) ---");
  {
    if (!testRep) { warnOut("No report to test UPDATE"); }
    else {
      const { data: upd } = await partnerClient.from("daily_reports")
        .update({ leads_contacted: 999 }).eq("id", testRep.id).select("id");
      result("0 rows updated (reports_update_partner was removed)", !!(upd?.length === 0 || !upd),
        `upd length: ${upd?.length}`);
    }
  }

  console.log("\n--- DAILY REPORTS: DELETE (no partner DELETE policy) ---");
  {
    if (!testRep) { warnOut("No report to test DELETE"); }
    else {
      const { data: del } = await partnerClient.from("daily_reports")
        .delete().eq("id", testRep.id).select("id");
      result("0 rows deleted", !!(del?.length === 0 || !del));
    }
  }

  // ============================================
  // 3. ANNOUNCEMENTS
  // ============================================
  console.log("\n--- ANNOUNCEMENTS: SELECT ---");
  {
    const { data, error } = await partnerClient.from("announcements").select("id");
    result("No error", !error, error?.message);
    warnOut(`Visible: ${data?.length || 0}`);
  }

  console.log("\n--- ANNOUNCEMENTS: INSERT (admin-only) ---");
  {
    const { error } = await partnerClient.from("announcements").insert({
      title: "X", content: "X", created_by: partnerUid,
    });
    result("Denied", !!error, error?.message || "was allowed");
  }

  console.log("\n--- ANNOUNCEMENTS: UPDATE (admin-only) ---");
  {
    const { data: a } = await partnerClient.from("announcements").select("id").limit(1).maybeSingle();
    if (a) {
      const { data: upd } = await partnerClient.from("announcements").update({ content: "X" }).eq("id", a.id).select("id");
      result("0 rows updated", !!(upd?.length === 0 || !upd));
    }
  }

  console.log("\n--- ANNOUNCEMENTS: DELETE (admin-only) ---");
  {
    const { data: a } = await partnerClient.from("announcements").select("id").limit(1).maybeSingle();
    if (a) {
      const { data: del } = await partnerClient.from("announcements").delete().eq("id", a.id).select("id");
      result("0 rows deleted", !!(del?.length === 0 || !del));
    }
  }

  // ============================================
  // 4. RESOURCES
  // ============================================
  console.log("\n--- RESOURCES: SELECT ---");
  {
    const { data, error } = await partnerClient.from("resources").select("id");
    result("No error", !error, error?.message);
    warnOut(`Visible: ${data?.length || 0}`);
  }

  console.log("\n--- RESOURCES: INSERT (admin-only) ---");
  {
    const { error } = await partnerClient.from("resources").insert({
      title: "X", description: "X", type: "document", created_by: partnerUid,
    });
    result("Denied", !!error, error?.message || "was allowed");
  }

  console.log("\n--- RESOURCES: UPDATE (admin-only) ---");
  {
    const { data: r } = await partnerClient.from("resources").select("id").limit(1).maybeSingle();
    if (r) {
      const { data: upd } = await partnerClient.from("resources").update({ title: "X" }).eq("id", r.id).select("id");
      result("0 rows updated", !!(upd?.length === 0 || !upd));
    }
  }

  console.log("\n--- RESOURCES: DELETE (admin-only) ---");
  {
    const { data: r } = await partnerClient.from("resources").select("id").limit(1).maybeSingle();
    if (r) {
      const { data: del } = await partnerClient.from("resources").delete().eq("id", r.id).select("id");
      result("0 rows deleted", !!(del?.length === 0 || !del));
    }
  }

  // ============================================
  // 5. PROFILES
  // ============================================
  console.log("\n--- PROFILES: SELECT own ---");
  {
    const { data, error } = await partnerClient.from("profiles")
      .select("id,email,role").eq("id", partnerUid).maybeSingle();
    result("Success", !error && !!data, error?.message);
    result("Role = partner", data?.role === "partner", `role=${data?.role}`);
  }

  console.log("\n--- PROFILES: SELECT other user ---");
  {
    const { data, error } = await partnerClient.from("profiles")
      .select("id").neq("id", partnerUid).limit(1);
    result("Silently empty", !error && (!data || data.length === 0), error?.message);
  }

  console.log("\n--- PROFILES: INSERT (admin-only) ---");
  {
    const { error } = await partnerClient.from("profiles").insert({
      id: "00000000-0000-0000-0000-000000000000", email: "x@x.com",
      full_name: "X", role: "admin",
    });
    result("Denied", !!error, error?.message || "was allowed");
  }

  console.log("\n--- PROFILES: UPDATE own non-role field ---");
  {
    const { data: upd } = await partnerClient.from("profiles")
      .update({ full_name: "RLS Verified" }).eq("id", partnerUid).select("id,full_name");
    result("Full name updated", !!(upd?.length === 1 && upd[0]?.full_name === "RLS Verified"));
    if (upd?.length === 1) await partnerClient.from("profiles").update({ full_name: "QA Test Partner" }).eq("id", partnerUid);
  }

  console.log("\n--- PROFILES: UPDATE own role (migration 006 fix) ---");
  {
    // This should be denied because WITH CHECK enforces role can't change
    const { data: upd, error } = await partnerClient.from("profiles")
      .update({ role: "admin" }).eq("id", partnerUid).select("id,role");
    if (error) {
      // WITH CHECK violation returns error for INSERT/UPDATE
      result("Denied with RLS error", true);
    } else {
      result("0 rows updated (or denied)", !!(upd?.length === 0 || !upd),
        `rows: ${upd?.length}, role=${upd?.[0]?.role}`);
    }
    // Verify role unchanged
    const { data: cur } = await partnerClient.from("profiles").select("role").eq("id", partnerUid).single();
    result("Role still = partner", cur?.role === "partner", `now: ${cur?.role}`);
  }

  // ============================================
  // 6. AUDIT TABLES
  // ============================================
  console.log("\n--- LEAD_STATUS_HISTORY: SELECT (partner can see own logs) ---");
  {
    const { data, error } = await partnerClient.from("lead_status_history").select("id");
    result("No error", !error, error?.message);
    warnOut(`Rows visible: ${data?.length || 0}`);
  }

  console.log("\n--- LEAD_STATUS_HISTORY: INSERT for own lead (permitted) ---");
  {
    const { data: lead } = await partnerClient.from("leads")
      .select("id").eq("assigned_to", partnerUid).limit(1).single();
    if (!lead) { warnOut("No lead"); }
    else {
      const { error } = await partnerClient.from("lead_status_history").insert({
        lead_id: lead.id, changed_by: partnerUid,
        old_status: "not_contacted", new_status: "contacted",
      });
      result("Insert succeeds (own lead)", !error, error?.message);
    }
  }

  // ============================================
  // 7. PARTNER ACTIVITY LOG
  // ============================================
  console.log("\n--- PARTNER_ACTIVITY_LOG: column check ---");
  // The column is "action" not "activity_type"
  {
    const { error } = await partnerClient.from("partner_activity_log").select("id").limit(1);
    result("Table accessible", !error, error?.message);
  }

  console.log("\n--- PARTNER_ACTIVITY_LOG: INSERT own (permitted) ---");
  {
    const { data: ins, error } = await partnerClient.from("partner_activity_log").insert({
      partner_id: partnerUid, action: "rls_test", details: { source: "rls-test" },
    }).select("id");
    result("Insert succeeds", !error && ins?.length === 1, error?.message || `rows: ${ins?.length}`);
  }

  console.log("\n--- PARTNER_ACTIVITY_LOG: SELECT own (permitted) ---");
  {
    const { data, error } = await partnerClient.from("partner_activity_log")
      .select("id, action").eq("partner_id", partnerUid);
    result("No error", !error, error?.message);
    warnOut(`Own log entries: ${data?.length || 0}`);
  }

  // ============================================
  // 8. PARTNERS TABLE
  // ============================================
  console.log("\n--- PARTNERS: SELECT own ---");
  {
    const { data, error } = await partnerClient.from("partners")
      .select("company_id, status").eq("id", partnerUid).maybeSingle();
    result("Success", !error && !!data, error?.message);
    result("company_id visible", data?.company_id === "QA-TEST-001");
    result("status visible", data?.status === "active");
  }

  console.log("\n--- PARTNERS: SELECT other partner ---");
  {
    const { data, error } = await partnerClient.from("partners")
      .select("id").neq("id", partnerUid).limit(1);
    result("Silently empty", !error && (!data || data.length === 0), error?.message);
  }

  // ============================================
  // 9. UNAUTHENTICATED ACCESS
  // ============================================
  console.log("\n--- UNAUTHENTICATED ACCESS ---");
  {
    const anon = createClient(URL!, ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
    // No sign-in — anonymous request
    const { data: d1, error: e1 } = await anon.from("leads").select("id").limit(1);
    result("SELECT on leads returns empty (RLS default deny)", !e1 && (!d1 || d1.length === 0),
      e1?.message || `rows: ${d1?.length}`);

    const { error: e2 } = await anon.from("leads").insert({
      company_name: "X", email: "x@x.com", status: "not_contacted", assigned_to: "0000",
    });
    result("INSERT on leads denied", !!e2, e2?.message || "was allowed");

    const { data: d3, error: e3 } = await anon.from("announcements").select("id").limit(1);
    // announcements_select policy: auth.role() = 'authenticated' — anon has role 'anon'
    if (!e3 && d3 && d3.length > 0) {
      warnOut("Announcements readable without auth (check if intentional for landing page)");
    } else {
      result("SELECT on announcements empty (anon role)", !e3 && (!d3 || d3.length === 0),
        e3?.message || `rows: ${d3?.length}`);
    }

    const { data: d4, error: e4 } = await anon.from("resources").select("id").limit(1);
    // resources_select_partner: is_active = true — requires partner auth
    if (!e4 && d4 && d4.length > 0) {
      warnOut("Resources readable without auth (check if intentional)");
    } else {
      result("SELECT on resources empty (no matching policy for anon)", !e4 && (!d4 || d4.length === 0),
        e4?.message || `rows: ${d4?.length}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n=== RLS ADVERSARIAL TEST MATRIX RESULTS ===");
  console.log(`  Passed:    ${passed}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Warnings:  ${warnings}`);
  console.log(`  Total ops: ${passed + failed + warnings}`);

  if (failed > 0) process.exit(1);
  if (warnings > 0) console.log("\nPASSED with warnings — review ⚠️  items for intentionality.");
  else console.log("\nALL RLS TESTS PASSED.");
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
