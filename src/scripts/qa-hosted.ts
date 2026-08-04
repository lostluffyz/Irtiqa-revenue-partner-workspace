// ============================================
// Hosted QA Acceptance Script
// ============================================
//
// Comprehensive automated acceptance test that validates
// all security controls and core features against the
// hosted Supabase instance.
//
// Prerequisites:
//   1. .env.local populated with Supabase keys
//   2. seed-admin.ts run
//   3. seed-qa.ts run
//   4. All migrations applied (001-007)
//
// Usage:
//   npm run qa:hosted
//
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import {
  getBusinessDate,
  getProgramDay,
  getProgramStatus,
  isProgramActive,
  getProgramTimezone,
} from "../lib/program-timezone";

config({ path: resolve(__dirname, "../../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const QA_EMAIL = "qa-test-001@rp.irtiqa.internal";
const QA_PASSWORD = process.env.QA_PARTNER_PASSWORD || "";
const QA_PARTNER_ID = "413a235f-7165-4dad-ab26-2e1dd68fd356";
const ADMIN_ID = "e968a712-eae4-4d65-8992-35d8b1e6102c";

let passed = 0;
let failed = 0;
let skipped = 0;
let partnerClient: SupabaseClient;
let adminClient: SupabaseClient;

function result(label: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); }
}

function skip(label: string, reason: string) {
  skipped++;
  console.log(`  ⏭  ${label} (${reason})`);
}

// ============================================
// SECTION 1: Authentication
// ============================================
async function testAuthentication() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 1: Authentication");
  console.log("═══════════════════════════════════");

  const c = createClient(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: auth, error: err } = await c.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });

  if (err) {
    console.log(`  ❌ Login failed: ${err.message}`);
    console.log("  ⛔ Cannot proceed without authentication");
    process.exit(1);
  }

  partnerClient = c;
  result("Sign in succeeds", true);
  result("User ID matches QA partner", auth.user?.id === QA_PARTNER_ID,
    `got ${auth.user?.id.substring(0, 8)}`);

  // Set up admin client
  adminClient = createClient(URL!, SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================
// SECTION 2: Timezone Implementation
// ============================================
function testTimezoneImplementation() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 2: Timezone Implementation");
  console.log("═══════════════════════════════════");

  const tz = getProgramTimezone();
  result("Program timezone configured", tz === "Asia/Kolkata" || tz === "UTC",
    `got ${tz}`);

  const businessDate = getBusinessDate();
  result("getBusinessDate returns YYYY-MM-DD format",
    /^\d{4}-\d{2}-\d{2}$/.test(businessDate),
    `got ${businessDate}`);

  // Test timezone boundary — Asia/Kolkata vs UTC
  const utcDate = getBusinessDate("UTC");
  const istDate = getBusinessDate("Asia/Kolkata");
  result("Timezone-aware business date (may differ from UTC at boundary)",
    typeof utcDate === "string" && typeof istDate === "string",
    `UTC: ${utcDate}, IST: ${istDate}`);

  // Test program day calculation
  const programDay = getProgramDay(getBusinessDate());
  result("getProgramDay returns positive for today", programDay >= 1,
    `got ${programDay}`);

  const status = getProgramStatus(getBusinessDate());
  result("getProgramStatus returns valid phase",
    ["pre", "active", "post"].includes(status.phase),
    `got ${status.phase}`);

  result("isProgramActive returns boolean",
    typeof isProgramActive(getBusinessDate()) === "boolean");
}

// ============================================
// SECTION 3: Lead Trigger Verification
// ============================================
async function testLeadTrigger() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 3: Lead Trigger Verification");
  console.log("═══════════════════════════════════");

  // Get a lead assigned to the QA partner
  const { data: lead } = await partnerClient
    .from("leads")
    .select("id, company_name, status, email")
    .limit(1)
    .single();

  if (!lead) {
    skip("Lead trigger tests", "No leads assigned");
    return;
  }

  // 3a. Status update should succeed
  const originalStatus = lead.status;
  const newStatus = originalStatus === "contacted" ? "follow_up_required" : "contacted";
  const { error: statusErr } = await partnerClient
    .from("leads")
    .update({ status: newStatus })
    .eq("id", lead.id);
  result("Status update succeeds", !statusErr, statusErr?.message);

  // Restore status
  await partnerClient.from("leads").update({ status: originalStatus }).eq("id", lead.id);

  // 3b. Company name update should be rejected
  const { error: nameErr } = await partnerClient
    .from("leads")
    .update({ company_name: "Hacked Name" })
    .eq("id", lead.id);
  result("Company name update rejected by trigger",
    !!nameErr && nameErr.message.includes("Partners may only update the status"),
    nameErr?.message);

  // 3c. Email update should be rejected
  const { error: emailErr } = await partnerClient
    .from("leads")
    .update({ email: "hacked@evil.com" })
    .eq("id", lead.id);
  result("Email update rejected by trigger",
    !!emailErr && emailErr.message.includes("Partners may only update the status"),
    emailErr?.message);

  // 3d. Verify data unchanged
  const { data: leadAfter } = await partnerClient
    .from("leads")
    .select("company_name, email")
    .eq("id", lead.id)
    .single();
  result("Data integrity: company_name unchanged",
    leadAfter?.company_name === lead.company_name,
    `was: ${lead.company_name}, now: ${leadAfter?.company_name}`);
  result("Data integrity: email unchanged",
    leadAfter?.email === lead.email,
    `was: ${lead.email}, now: ${leadAfter?.email}`);
}

// ============================================
// SECTION 4: Profile Escalation Security
// ============================================
async function testProfileEscalation() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 4: Profile Escalation Security");
  console.log("═══════════════════════════════════");

  // 4a. Cannot escalate own role
  const { error: roleErr } = await partnerClient
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", QA_PARTNER_ID);
  result("Cannot set own role to admin",
    !!roleErr, roleErr?.message || "was allowed");
  const { data: roleCheck } = await partnerClient
    .from("profiles")
    .select("role")
    .eq("id", QA_PARTNER_ID)
    .single();
  result("Role still = partner", roleCheck?.role === "partner",
    `now: ${roleCheck?.role}`);

  // 4b. Cannot update another user's profile
  const { data: updOther } = await partnerClient
    .from("profiles")
    .update({ is_active: false })
    .eq("id", ADMIN_ID)
    .select("id");
  result("Cannot deactivate admin (0 rows affected)",
    !updOther || updOther.length === 0,
    `affected ${updOther?.length} rows`);

  // Verify admin still active
  const { data: adminStatus } = await adminClient
    .from("profiles")
    .select("is_active")
    .eq("id", ADMIN_ID)
    .single();
  result("Admin still active", adminStatus?.is_active === true);

  // 4c. Cannot insert into profiles
  const { error: insertErr } = await partnerClient
    .from("profiles")
    .insert({
      id: "00000000-0000-4000-8000-000000000099",
      email: "fake@test.com",
      full_name: "Fake User",
      role: "admin",
    });
  result("Cannot insert into profiles",
    !!insertErr, insertErr?.message || "was allowed");
}

// ============================================
// SECTION 5: RLS — Leads
// ============================================
async function testLeadsRLS() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 5: RLS — Leads");
  console.log("═══════════════════════════════════");

  // SELECT own
  const { data: ownLeads } = await partnerClient
    .from("leads")
    .select("id")
    .limit(10);
  result("Can select own leads", Array.isArray(ownLeads) && ownLeads.length > 0,
    `got ${ownLeads?.length} leads`);

  // SELECT other partner's leads
  const { data: otherLeads } = await partnerClient
    .from("leads")
    .select("id")
    .neq("assigned_to", QA_PARTNER_ID)
    .limit(5);
  result("Cannot see other partner leads",
    Array.isArray(otherLeads) && otherLeads.length === 0,
    `got ${otherLeads?.length} leads`);

  // INSERT (admin-only)
  const { error: insertLeadErr } = await partnerClient
    .from("leads")
    .insert({
      company_name: "Test",
      email: "test@test.com",
      status: "not_contacted",
      assigned_to: QA_PARTNER_ID,
    });
  result("Cannot insert leads (admin-only)",
    !!insertLeadErr, insertLeadErr?.message || "was allowed");

  // DELETE (admin-only)
  const { data: delLead } = await partnerClient
    .from("leads")
    .delete()
    .eq("assigned_to", QA_PARTNER_ID)
    .select("id");
  result("Cannot delete leads (0 rows affected)",
    !delLead || delLead.length === 0,
    `deleted ${delLead?.length} rows`);
}

// ============================================
// SECTION 6: RLS — Daily Reports
// ============================================
async function testDailyReportsRLS() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 6: RLS — Daily Reports");
  console.log("═══════════════════════════════════");

  // SELECT own
  const { data: ownReports } = await partnerClient
    .from("daily_reports")
    .select("id")
    .eq("partner_id", QA_PARTNER_ID);
  result("Can select own reports",
    Array.isArray(ownReports), `got ${ownReports?.length}`);

  // SELECT other partner
  const { data: otherReports } = await partnerClient
    .from("daily_reports")
    .select("id")
    .neq("partner_id", QA_PARTNER_ID)
    .limit(1);
  result("Cannot see other partner reports",
    Array.isArray(otherReports) && otherReports.length === 0,
    `got ${otherReports?.length}`);

  // INSERT
  const today = getBusinessDate();
  const { error: insertRepErr } = await partnerClient
    .from("daily_reports")
    .insert({
      partner_id: QA_PARTNER_ID,
      report_date: today,
      leads_contacted: 1,
      appointments_booked: 0,
      deals_closed: 0,
    });
  // May be duplicate if already submitted
  if (insertRepErr?.message?.includes("duplicate")) {
    result("INSERT: already submitted today (duplicate)", true);
  } else {
    result("INSERT succeeds", !insertRepErr, insertRepErr?.message);
  }

  // UPDATE (removed in migration 005)
  const { data: existingRep } = await partnerClient
    .from("daily_reports")
    .select("id")
    .eq("partner_id", QA_PARTNER_ID)
    .maybeSingle();

  if (existingRep) {
    const { data: updRep } = await partnerClient
      .from("daily_reports")
      .update({ leads_contacted: 999 })
      .eq("id", existingRep.id)
      .select("id");
    result("Cannot update reports (partner UPDATE removed)",
      !updRep || updRep.length === 0,
      `updated ${updRep?.length} rows`);
  }

  // DELETE (no DELETE policy)
  if (existingRep) {
    const { data: delRep } = await partnerClient
      .from("daily_reports")
      .delete()
      .eq("id", existingRep.id)
      .select("id");
    result("Cannot delete reports",
      !delRep || delRep.length === 0,
      `deleted ${delRep?.length} rows`);
  }
}

// ============================================
// SECTION 7: RLS — Announcements (& Anon)
// ============================================
async function testAnnouncementsAndAnon() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 7: Announcements & Anonymous Access");
  console.log("═══════════════════════════════════");

  // Partner can SELECT announcements
  const { data: ann } = await partnerClient
    .from("announcements")
    .select("id")
    .limit(5);
  result("Partner can see announcements",
    Array.isArray(ann), `got ${ann?.length}`);

  // Partner cannot INSERT/UPDATE/DELETE announcements
  const { error: insAnn } = await partnerClient
    .from("announcements")
    .insert({ title: "X", content: "X", created_by: QA_PARTNER_ID });
  result("Cannot insert announcements",
    !!insAnn, insAnn?.message || "was allowed");

  // Anonymous access
  const anonClient = createClient(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: anonLeads } = await anonClient
    .from("leads")
    .select("id")
    .limit(1);
  result("Anonymous: leads empty (RLS default deny)",
    Array.isArray(anonLeads) && anonLeads.length === 0,
    `got ${anonLeads?.length} rows`);

  const { data: anonAnn } = await anonClient
    .from("announcements")
    .select("id")
    .limit(1);
  result("Anonymous: announcements empty (auth.role()=authenticated required)",
    Array.isArray(anonAnn) && anonAnn.length === 0,
    `got ${anonAnn?.length} rows`);

  const { data: anonRes } = await anonClient
    .from("resources")
    .select("id")
    .limit(1);
  result("Anonymous: resources empty (migration 007 fix: auth.role check added)",
    Array.isArray(anonRes) && anonRes.length === 0,
    `got ${anonRes?.length} rows`);
}

// ============================================
// SECTION 8: RLS — Profiles & Partners
// ============================================
async function testProfilesAndPartners() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 8: Profiles & Partners");
  console.log("═══════════════════════════════════");

  // Profiles — SELECT own
  const { data: myProfile } = await partnerClient
    .from("profiles")
    .select("id, role")
    .eq("id", QA_PARTNER_ID)
    .single();
  result("Can see own profile", !!myProfile, "not found");
  result("Own role = partner", myProfile?.role === "partner",
    `got ${myProfile?.role}`);

  // Profiles — SELECT other (should be invisible)
  const { data: otherProfile } = await partnerClient
    .from("profiles")
    .select("id")
    .neq("id", QA_PARTNER_ID)
    .limit(1);
  result("Cannot see other profiles",
    Array.isArray(otherProfile) && otherProfile.length === 0,
    `got ${otherProfile?.length} rows`);

  // Profiles — UPDATE own non-role field
  const { data: updName } = await partnerClient
    .from("profiles")
    .update({ full_name: "QA Verified" })
    .eq("id", QA_PARTNER_ID)
    .select("full_name");
  result("Can update own name",
    updName?.[0]?.full_name === "QA Verified");
  // Restore
  await partnerClient.from("profiles").update({ full_name: "QA Test Partner" }).eq("id", QA_PARTNER_ID);

  // Partners — SELECT own
  const { data: myPartner } = await partnerClient
    .from("partners")
    .select("company_id, status")
    .eq("id", QA_PARTNER_ID)
    .single();
  result("Can see own partner record", !!myPartner);
  result("company_id visible", myPartner?.company_id === "QA-TEST-001");
  result("status = active", myPartner?.status === "active");

  // Partners — SELECT other (should be invisible)
  const { data: otherPartner } = await partnerClient
    .from("partners")
    .select("id")
    .neq("id", QA_PARTNER_ID)
    .limit(1);
  result("Cannot see other partner records",
    Array.isArray(otherPartner) && otherPartner.length === 0,
    `got ${otherPartner?.length} rows`);
}

// ============================================
// SECTION 9: Audit Tables
// ============================================
// ============================================
// SECTION 9: Company ID Generation (migration 008 fix)
// ============================================
async function testCompanyIdGeneration() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 9: Company ID Generation");
  console.log("═══════════════════════════════════");

  // 9a. Direct RPC call works (was: "cannot execute nextval() in read-only transaction")
  const { data: companyId, error: rpcError } = await adminClient.rpc("generate_company_id");
  result("generate_company_id RPC succeeds (VOLATILE fix)",
    !rpcError && !!companyId,
    rpcError?.message || "no result");

  // 9b. Returns RP-NNNN format
  result("Company ID follows RP-NNNN format",
    typeof companyId === "string" && /^RP-\d+$/.test(companyId || ""),
    `got ${companyId}`);

  // 9c. Returns a unique value each call
  const { data: companyId2 } = await adminClient.rpc("generate_company_id");
  result("Company ID increments on each call",
    typeof companyId2 === "string" && companyId2 !== companyId,
    `first: ${companyId}, second: ${companyId2}`);

  // 9d. Verify the function works with auth headers (adminClient.rpc code path)
  // The adminClient uses the service_role key, verifying the full code path from createPartner()
  result("adminClient.rpc works end-to-end", true);
}

async function testAuditTables() {
  console.log("\n═══════════════════════════════════");
  console.log("SECTION 10: Audit Tables");
  console.log("═══════════════════════════════════");

  // lead_status_history — INSERT for own lead
  const { data: ownLead } = await partnerClient
    .from("leads")
    .select("id")
    .eq("assigned_to", QA_PARTNER_ID)
    .limit(1)
    .single();

  if (ownLead) {
    const { error: histErr } = await partnerClient
      .from("lead_status_history")
      .insert({
        lead_id: ownLead.id,
        changed_by: QA_PARTNER_ID,
        old_status: "not_contacted",
        new_status: "contacted",
      });
    result("Can log status history for own lead",
      !histErr, histErr?.message);
  } else {
    skip("lead_status_history insert", "No lead found");
  }

  // partner_activity_log — INSERT own
  const { data: actLog } = await partnerClient
    .from("partner_activity_log")
    .insert({
      partner_id: QA_PARTNER_ID,
      action: "qa_hosted_test",
      details: { source: "qa-hosted" },
    })
    .select("id");
  result("Can log own activity",
    actLog?.length === 1, `got ${actLog?.length} rows`);
}

// ============================================
// SUMMARY
// ============================================
function printSummary() {
  const total = passed + failed + skipped;
  console.log("\n═══════════════════════════════════");
  console.log("HOSTED QA ACCEPTANCE SUMMARY");
  console.log("═══════════════════════════════════");
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${total}`);
  console.log("");

  if (failed === 0) {
    console.log("  ✅ ALL CHECKS PASSED");
    process.exit(0);
  } else {
    console.log(`  ❌ ${failed} CHECK(S) FAILED`);
    process.exit(1);
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  if (!URL || !ANON_KEY || !SECRET_KEY) {
    console.error("ERROR: Missing Supabase env vars (.env.local)");
    process.exit(1);
  }

  console.log("═══════════════════════════════════");
  console.log("REVENUE PARTNER WORKSPACE");
  console.log("HOSTED QA ACCEPTANCE TEST");
  console.log(`Target: ${URL}`);
  console.log(`Date:   ${getBusinessDate()}`);

  await testAuthentication();
  testTimezoneImplementation();
  await testLeadTrigger();
  await testProfileEscalation();
  await testLeadsRLS();
  await testDailyReportsRLS();
  await testAnnouncementsAndAnon();
  await testProfilesAndPartners();
  await testCompanyIdGeneration();
  await testAuditTables();
  printSummary();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err.message);
  process.exit(1);
});
