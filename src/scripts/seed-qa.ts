// ============================================
// QA Fixture Seed Script
// ============================================
//
// WARNING: QA/DEVELOPMENT TOOLING ONLY.
// This script creates test data in the hosted database.
// Never expose its imports or functionality in browser code.
//
// Usage:
//   npx tsx src/scripts/seed-qa.ts
//
// Prerequisites:
//   1. .env.local populated with Supabase keys
//   2. All migrations applied (001–005)
//   3. Admin user exists (run seed-admin.ts first)
//
// What it creates:
//   - 1 QA Revenue Partner (company_id: QA-TEST-001)
//   - 8 test leads with various statuses
//   - 3 announcements (1 pinned)
//   - 3 resources of different types (document, link, video)
//
// Cleanup:
//   To remove all QA fixtures, run:
//     npx tsx src/scripts/seed-qa.ts --clean
//   This removes the QA partner, their leads, and QA-specific
//   announcements and resources. The QA auth user is also deleted.
//
// Security:
//   - Uses SUPABASE_SECRET_KEY — server-side only
//   - Password is generated or read from QA_PARTNER_PASSWORD env var
//   - Password is never stored in application tables
//   - Printed once on creation; stored nowhere
//   - Idempotent: safe to re-run (skips existing fixtures)
//
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// --------------- configuration ---------------

const QA_COMPANY_ID = "QA-TEST-001";
const QA_PARTNER_NAME = "QA Test Partner";
const QA_PARTNER_PHONE = "+1-555-000-0001";

// North America region UUID (from seed data in migration 001)
const QA_REGION_ID = "c0283333-8f9d-43a7-80eb-21e55179fa48";

// Start date 15 days ago — partner is on Day 16, inside the 30-day program
const PROGRAM_START_DATE_OFFSET_DAYS = 15;

// --------------- helpers ---------------

function generatePassword(length = 16): string {
  return randomBytes(length)
    .toString("base64")
    .replace(/[^a-zA-Z0-9!@#$%^&*]/g, "")
    .slice(0, length);
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// --------------- main ---------------

async function main() {
  const isClean = process.argv.includes("--clean");

  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error("ERROR: Supabase environment variables not set.");
    console.error("  Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== QA Fixture Seed ===");
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Date:   ${todayISO()}`);
  console.log("");

  if (isClean) {
    await cleanFixtures(supabase);
    return;
  }

  // Check if QA partner already exists
  const { data: existingPartner } = await supabase
    .from("partners")
    .select("id, company_id")
    .eq("company_id", QA_COMPANY_ID)
    .maybeSingle();

  if (existingPartner) {
    console.log(`QA partner ${QA_COMPANY_ID} already exists (ID: ${existingPartner.id}).`);
    console.log("Skipping creation — use --clean to remove and re-seed.");
    console.log("");
    await ensureFixtures(supabase, existingPartner.id);
    return;
  }

  // Create the QA partner
  const password = process.env.QA_PARTNER_PASSWORD || generatePassword();
  const programStartDate = daysAgoISO(PROGRAM_START_DATE_OFFSET_DAYS);
  const authEmail = `${QA_COMPANY_ID.toLowerCase()}@rp.irtiqa.internal`;

  console.log("Creating QA Revenue Partner...");

  // Create auth user
  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: QA_PARTNER_NAME,
      role: "partner",
    },
  });

  if (createError) {
    console.error("ERROR: Failed to create auth user:", createError.message);
    process.exit(1);
  }

  const userId = authUser.user.id;
  console.log(`  Auth user created: ${userId}`);

  // Create/upsert profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email: authEmail,
    full_name: QA_PARTNER_NAME,
    role: "partner",
    is_active: true,
  }, { onConflict: "id" });

  if (profileError) {
    console.error("ERROR: Failed to create profile:", profileError.message);
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    process.exit(1);
  }
  console.log("  Profile created: role=partner, is_active=true");

  // Create partner record
  const { error: partnerError } = await supabase.from("partners").insert({
    id: userId,
    company_id: QA_COMPANY_ID,
    region_id: QA_REGION_ID,
    phone: QA_PARTNER_PHONE,
    status: "active",
    program_start_date: programStartDate,
  });

  if (partnerError) {
    console.error("ERROR: Failed to create partner record:", partnerError.message);
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    process.exit(1);
  }
  console.log(`  Partner record created: company_id=${QA_COMPANY_ID}`);
  console.log(`  Program start: ${programStartDate} (Day ~${PROGRAM_START_DATE_OFFSET_DAYS + 1})`);
  console.log("");

  console.log("=== QA PARTNER CREDENTIALS (one-time display) ===");
  console.log(`  Company ID: ${QA_COMPANY_ID}`);
  console.log(`  Password:   ${password}`);
  console.log("=================================================");
  console.log("");

  await ensureFixtures(supabase, userId);
}

async function ensureFixtures(
  supabase: SupabaseClient,
  partnerId: string,
) {
  // --------------- leads ---------------
  console.log("Creating QA leads...");

  const leads = [
    { company_name: "Acme Corp", email: "contact@acme.com", phone: "+1-555-0101", status: "not_contacted", industry: "Technology", country: "United States" },
    { company_name: "BrightPath Consulting", email: "info@brightpath.io", phone: "+1-555-0102", status: "contacted", industry: "Consulting", country: "Canada" },
    { company_name: "CloudNine Solutions", email: "hello@cloudnine.dev", phone: "+1-555-0103", status: "follow_up_required", industry: "Cloud Services", country: "United States" },
    { company_name: "Delta Manufacturing", email: "sales@delta-mfg.com", phone: "+1-555-0104", status: "appointment_booked", industry: "Manufacturing", country: "Mexico" },
    { company_name: "Evergreen Health", email: "info@evergreen.health", phone: "+1-555-0105", status: "closed", industry: "Healthcare", country: "United States" },
    { company_name: "FirstRate Logistics", email: "ops@firstrate.com", phone: "+1-555-0106", status: "not_interested", industry: "Logistics", country: "Germany" },
    { company_name: "Grandview Analytics", email: "team@grandview.ai", phone: "+1-555-0107", status: "invalid_contact", industry: "Analytics", country: "United Kingdom" },
    { company_name: "Horizon Media Group", email: "contact@horizonmedia.co", phone: "+1-555-0108", status: "not_contacted", industry: "Media", country: "Australia" },
  ];

  for (const lead of leads) {
    // Check if already exists (by company_name for simplicity)
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("company_name", lead.company_name)
      .eq("assigned_to", partnerId)
      .maybeSingle();

    if (existing) {
      console.log(`  [SKIP] Lead "${lead.company_name}" already exists`);
      continue;
    }

    const { error } = await supabase.from("leads").insert({
      company_name: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      industry: lead.industry,
      country: lead.country,
      created_by: partnerId,
      assigned_to: partnerId,
      assigned_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`  [ERR] Lead "${lead.company_name}": ${error.message}`);
    } else {
      console.log(`  [OK]  Lead "${lead.company_name}" (${lead.status})`);
    }
  }
  console.log("");

  // --------------- announcements ---------------
  console.log("Creating QA announcements...");

  const announcements = [
    { title: "Welcome to the Revenue Partner Program", content: "We are excited to have you onboard! This program is designed to help you succeed in driving revenue growth. Please review the onboarding materials in the Resources section.", is_pinned: true },
    { title: "Monthly Performance Review — July 2026", content: "Monthly performance reviews will be held on July 20th. Please ensure all daily reports are submitted on time. Outstanding performers will be recognized in the next all-hands call.", is_pinned: false },
    { title: "New Training Module Available", content: "A new training module on Advanced Sales Techniques is now available in the Resources section. Completing this module by end of month is highly recommended.", is_pinned: false },
  ];

  for (const ann of announcements) {
    const { data: existing } = await supabase
      .from("announcements")
      .select("id")
      .eq("title", ann.title)
      .maybeSingle();

    if (existing) {
      console.log(`  [SKIP] Announcement "${ann.title}" already exists`);
      continue;
    }

    const { error } = await supabase.from("announcements").insert({
      title: ann.title,
      content: ann.content,
      is_pinned: ann.is_pinned,
      created_by: partnerId,
    });

    if (error) {
      console.error(`  [ERR] Announcement "${ann.title}": ${error.message}`);
    } else {
      console.log(`  [OK]  Announcement "${ann.title}"${ann.is_pinned ? " (pinned)" : ""}`);
    }
  }
  console.log("");

  // --------------- resources ---------------
  console.log("Creating QA resources...");

  const resources = [
    { title: "Revenue Partner Onboarding Guide", description: "Complete guide to getting started as a Revenue Partner. Covers tools, processes, and best practices.", type: "document", url: "", sort_order: 1, is_active: true },
    { title: "Product Demo Video", description: "Walkthrough of our platform features and how to demonstrate them to prospects.", type: "video", url: "https://example.com/demo", sort_order: 2, is_active: true },
    { title: "Frequently Asked Questions", description: "Common questions from Revenue Partners about the program, commissions, and support.", type: "faq", url: "", sort_order: 3, is_active: true },
  ];

  for (const res of resources) {
    const { data: existing } = await supabase
      .from("resources")
      .select("id")
      .eq("title", res.title)
      .maybeSingle();

    if (existing) {
      console.log(`  [SKIP] Resource "${res.title}" already exists`);
      continue;
    }

    const { error } = await supabase.from("resources").insert({
      title: res.title,
      description: res.description,
      type: res.type,
      url: res.url || null,
      file_path: null,
      sort_order: res.sort_order,
      is_active: res.is_active,
      created_by: partnerId,
    });

    if (error) {
      console.error(`  [ERR] Resource "${res.title}": ${error.message}`);
    } else {
      console.log(`  [OK]  Resource "${res.title}" (${res.type})`);
    }
  }
  console.log("");

  console.log("=== QA Fixture Seed Complete ===");
  console.log(`  Partner: ${QA_COMPANY_ID} (ID: ${partnerId})`);
  console.log(`  Leads:   ${leads.length}`);
  console.log(`  Announcements: ${announcements.length}`);
  console.log(`  Resources: ${resources.length}`);
  console.log("");
  console.log("Login at /login using Company ID credentials.");
}

async function cleanFixtures(supabase: SupabaseClient) {
  console.log("Cleaning QA fixtures...");

  // Find and remove QA announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id")
    .in("title", [
      "Welcome to the Revenue Partner Program",
      "Monthly Performance Review — July 2026",
      "New Training Module Available",
    ]);

  if (announcements) {
    for (const ann of announcements) {
      await supabase.from("announcements").delete().eq("id", ann.id);
      console.log(`  [DEL] Announcement ${ann.id}`);
    }
  }

  // Find and remove QA resources
  const { data: resources } = await supabase
    .from("resources")
    .select("id")
    .in("title", [
      "Revenue Partner Onboarding Guide",
      "Product Demo Video",
      "Frequently Asked Questions",
    ]);

  if (resources) {
    for (const res of resources) {
      await supabase.from("resources").delete().eq("id", res.id);
      console.log(`  [DEL] Resource ${res.id}`);
    }
  }

  // Find QA partner
  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("company_id", QA_COMPANY_ID)
    .maybeSingle();

  if (partner) {
    // Remove leads assigned to this partner
    const { count: deletedLeads } = await supabase
      .from("leads")
      .delete()
      .eq("assigned_to", partner.id);

    console.log(`  [DEL] ${deletedLeads || 0} leads for ${QA_COMPANY_ID}`);

    // Remove daily reports
    await supabase.from("daily_reports").delete().eq("partner_id", partner.id);

    // The partner record and profile cascade from auth.users deletion
    // But partners table has FK to profiles, profiles has FK to auth.users with CASCADE
    // We need to delete in order: cascade should handle it

    // Delete the auth user (cascades to profile and partner via FK)
    const { error } = await supabase.auth.admin.deleteUser(partner.id);
    if (error) {
      console.error(`  [ERR] Failed to delete auth user: ${error.message}`);
      // Fallback: try direct delete
      await supabase.from("partners").delete().eq("id", partner.id);
      await supabase.from("profiles").delete().eq("id", partner.id);
    } else {
      console.log(`  [DEL] Auth user, profile, and partner record for ${QA_COMPANY_ID}`);
    }
  } else {
    console.log(`  [SKIP] Partner ${QA_COMPANY_ID} not found`);
  }

  console.log("");
  console.log("Cleanup complete.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
