// ============================================
// Production Data Reset Script
// ============================================
//
// Removes all demo, QA, and placeholder data from the database
// while preserving the admin account, schema, RLS policies, and regions.
//
// Usage:
//   npx tsx src/scripts/cleanup-demo-data.ts
//
// Safety:
//   - Preserves the admin user (admin@irtiqa.ai)
//   - Preserves regions (reference data)
//   - Preserves schema, triggers, RLS policies
//   - Deletes in FK-safe order
//   - Idempotent: safe to run multiple times
//
// ============================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { PROTECTED_ACCOUNTS } from "@/lib/system-accounts";

config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Use centralized protected accounts — single source of truth
const ADMIN_EMAIL = [...PROTECTED_ACCOUNTS][0];

let deletedTotal = 0;

function count(label: string, n: number) {
  deletedTotal += n;
  if (n > 0) {
    console.log(`  Deleted ${n} ${label}`);
  } else {
    console.log(`  No ${label} to delete`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error("ERROR: Missing Supabase env vars (.env.local)");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== Production Data Reset ===");
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Preserving admin: ${ADMIN_EMAIL}`);
  console.log("");

  // ── Step 1: Find admin user ID ──
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .single();

  if (!adminProfile) {
    console.error(`ERROR: Admin user (${ADMIN_EMAIL}) not found. Aborting.`);
    process.exit(1);
  }
  const adminId = adminProfile.id;
  console.log(`Admin user ID: ${adminId}`);
  console.log("");

  // ── Step 2: Find all non-admin partner IDs ──
  const { data: nonAdminPartners } = await supabase
    .from("partners")
    .select("id")
    .neq("id", adminId);

  const partnerIds = (nonAdminPartners || []).map((p) => p.id);
  console.log(`Found ${partnerIds.length} non-admin partner(s) to remove`);

  // ── Step 3: Find all non-admin profile IDs ──
  const { data: nonAdminProfiles } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", adminId);

  const profileIds = (nonAdminProfiles || []).map((p) => p.id);
  console.log(`Found ${profileIds.length} non-admin profile(s) to remove`);
  console.log("");

  // ── Step 4: Delete in FK-safe order ──

  // 4a. lead_status_history (FK → leads.id CASCADE, but delete explicitly for clarity)
  console.log("Cleaning lead_status_history...");
  if (partnerIds.length > 0) {
    const { count: n } = await supabase
      .from("lead_status_history")
      .delete()
      .in("lead_id",
        // Subquery: get lead IDs owned by non-admin partners
        (await supabase.from("leads").select("id").in("assigned_to", partnerIds)).data?.map(l => l.id) || []
      );
    count("lead_status_history records", n || 0);
  } else {
    const { count: n } = await supabase.from("lead_status_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    count("lead_status_history records", n || 0);
  }

  // 4b. leads (FK → partners.id, profiles.id)
  console.log("Cleaning leads...");
  if (partnerIds.length > 0) {
    const { count: n } = await supabase
      .from("leads")
      .delete()
      .in("assigned_to", partnerIds);
    count("leads", n || 0);
  }
  // Also delete leads not assigned to any partner but created by non-admin
  {
    const { count: n } = await supabase
      .from("leads")
      .delete()
      .in("created_by", profileIds);
    count("orphaned leads", n || 0);
  }

  // 4c. daily_reports (FK → partners.id)
  console.log("Cleaning daily_reports...");
  if (partnerIds.length > 0) {
    const { count: n } = await supabase
      .from("daily_reports")
      .delete()
      .in("partner_id", partnerIds);
    count("daily_reports", n || 0);
  }

  // 4d. partner_activity_log (FK → partners.id)
  console.log("Cleaning partner_activity_log...");
  if (partnerIds.length > 0) {
    const { count: n } = await supabase
      .from("partner_activity_log")
      .delete()
      .in("partner_id", partnerIds);
    count("activity log entries", n || 0);
  }

  // 4e. announcements (FK → profiles.id)
  console.log("Cleaning announcements...");
  {
    const { count: n } = await supabase
      .from("announcements")
      .delete()
      .neq("created_by", adminId);
    count("announcements", n || 0);
  }

  // 4f. resources (FK → profiles.id)
  console.log("Cleaning resources...");
  {
    const { count: n } = await supabase
      .from("resources")
      .delete()
      .neq("created_by", adminId);
    count("resources", n || 0);
  }

  // 4g. partners (FK → profiles.id CASCADE)
  console.log("Cleaning partners...");
  if (partnerIds.length > 0) {
    const { count: n } = await supabase
      .from("partners")
      .delete()
      .in("id", partnerIds);
    count("partner records", n || 0);
  }

  // 4h. profiles (non-admin only — FK → auth.users CASCADE)
  console.log("Cleaning profiles...");
  if (profileIds.length > 0) {
    const { count: n } = await supabase
      .from("profiles")
      .delete()
      .in("id", profileIds);
    count("profile records", n || 0);
  }

  // ── Step 5: Delete non-admin auth users ──
  console.log("Cleaning auth.users...");
  const { data: allUsers } = await supabase.auth.admin.listUsers();
  const nonAdminUsers = (allUsers?.users || []).filter((u) => u.id !== adminId);

  let authDeleted = 0;
  for (const user of nonAdminUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.log(`  [SKIP] Auth user ${user.email}: ${error.message}`);
    } else {
      authDeleted++;
    }
  }
  count("auth users", authDeleted);

  // ── Step 6: Clean orphaned records (leads with deleted partners) ──
  console.log("Cleaning orphaned leads (assigned_to references deleted partners)...");
  {
    const { data: allLeads } = await supabase.from("leads").select("id, assigned_to");
    if (allLeads && allLeads.length > 0) {
      const assignedIds = [...new Set(allLeads.map((l) => l.assigned_to).filter(Boolean))] as string[];
      let validPartnerIds = new Set<string>();
      if (assignedIds.length > 0) {
        const { data: validPartners } = await supabase
          .from("partners")
          .select("id")
          .in("id", assignedIds);
        validPartnerIds = new Set(validPartners?.map((p) => p.id) || []);
      }
      const orphanedIds = allLeads
        .filter((l) => !l.assigned_to || !validPartnerIds.has(l.assigned_to))
        .map((l) => l.id);
      if (orphanedIds.length > 0) {
        const { count: n } = await supabase.from("leads").delete().in("id", orphanedIds);
        count("orphaned leads", n || 0);
      } else {
        console.log("  No orphaned leads found");
      }
    } else {
      console.log("  No leads to check");
    }
  }

  // Also clean orphaned lead_status_history
  console.log("Cleaning orphaned lead_status_history...");
  {
    const { data: allHistory } = await supabase.from("lead_status_history").select("id, lead_id");
    if (allHistory && allHistory.length > 0) {
      const leadIds = [...new Set(allHistory.map((h) => h.lead_id))];
      const { data: validLeads } = await supabase.from("leads").select("id").in("id", leadIds);
      const validLeadIds = new Set(validLeads?.map((l) => l.id) || []);
      const orphanedIds = allHistory.filter((h) => !validLeadIds.has(h.lead_id)).map((h) => h.id);
      if (orphanedIds.length > 0) {
        const { count: n } = await supabase.from("lead_status_history").delete().in("id", orphanedIds);
        count("orphaned lead_status_history", n || 0);
      } else {
        console.log("  No orphaned history found");
      }
    } else {
      console.log("  No history to check");
    }
  }

  // ── Step 6: Verify clean state ──
  console.log("");
  console.log("=== Verification ===");

  const [{ count: partnerCount }, { count: leadCount }, { count: reportCount }, { count: announcementCount }, { count: resourceCount }, { count: profileCount }] = await Promise.all([
    supabase.from("partners").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("daily_reports").select("id", { count: "exact", head: true }),
    supabase.from("announcements").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  console.log(`  Partners:        ${partnerCount || 0}`);
  console.log(`  Leads:           ${leadCount || 0}`);
  console.log(`  Daily Reports:   ${reportCount || 0}`);
  console.log(`  Announcements:   ${announcementCount || 0}`);
  console.log(`  Resources:       ${resourceCount || 0}`);
  console.log(`  Profiles:        ${profileCount || 0}`);

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log(`  Auth Users:      ${authUsers?.users?.length || 0}`);

  // Verify admin exists
  const { data: adminCheck } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", adminId)
    .single();

  console.log(`  Admin preserved: ${adminCheck?.email === ADMIN_EMAIL ? "✅ YES" : "❌ NO"}`);
  console.log(`  Admin role:      ${adminCheck?.role || "unknown"}`);

  console.log("");
  console.log(`=== Complete ===`);
  console.log(`Total records deleted: ${deletedTotal}`);

  // Check for any remaining non-admin data
  const { data: regions } = await supabase.from("regions").select("name");
  console.log(`  Regions (preserved): ${regions?.map((r) => r.name).join(", ") || "none"}`);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err.message);
  process.exit(1);
});
