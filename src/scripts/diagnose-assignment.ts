// ============================================
// READ-ONLY Diagnostic — Smart Lead Assignment
// ============================================
// Reproduces the "Will Assign: 0 / Filter Excluded 1000" bug.
// Performs SELECT/COUNT queries ONLY. No writes.
//
// Usage:
//   npx tsx src/scripts/diagnose-assignment.ts
// ============================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Total leads (this is what drives "Eligible")
  const { count: totalLeads, error: totalErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true });
  console.log(`Total leads:            ${totalLeads}  error: ${totalErr?.message ?? "none"}`);

  // 2. Unassigned leads (assigned_to IS NULL)
  const { count: unassigned, error: unassignedErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null);
  console.log(`Unassigned leads:       ${unassigned}  error: ${unassignedErr?.message ?? "none"}`);

  // 3. Fetch active partners (the 7 selected)
  const { data: partners, error: partnersErr } = await admin
    .from("partners")
    .select("id, company_id, status")
    .eq("status", "active");
  if (partnersErr || !partners) {
    console.error("Failed to fetch partners:", partnersErr?.message);
    process.exit(1);
  }
  const selected = partners.slice(0, 7);
  console.log(`Active partners found:  ${partners.length} (using ${selected.length})`);
  console.log(`Sample partner id:      ${selected[0]?.id}`);

  const ids = selected.map((p: { id: string }) => p.id);

  // 4. REPRO: baseUnassignedQuery + excludeAssignedToPartners (NOT IN on top of IS NULL)
  const notIn = `(${ids.map((id) => `"${id}"`).join(",")})`;
  console.log(`\n"not in" value:         ${notIn}`);
  const { count: reproCount, error: reproErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null)
    .not("assigned_to", "in", notIn);
  console.log(`IS NULL AND NOT IN:     ${reproCount ?? "null"}  error: ${reproErr?.message ?? "none"}`);

  // 4b. Single-partner path (neq) on top of IS NULL
  const { count: singleCount, error: singleErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null)
    .neq("assigned_to", ids[0]);
  console.log(`IS NULL AND NEQ:        ${singleCount ?? "null"}  error: ${singleErr?.message ?? "none"}`);

  // 4c. NOT IN WITHOUT the IS NULL predicate (standalone exclude)
  const { count: notInOnly, error: notInOnlyErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .not("assigned_to", "in", notIn);
  console.log(`NOT IN only:            ${notInOnly ?? "null"}  error: ${notInOnlyErr?.message ?? "none"}`);

  // 5. FIXED: IS NULL alone (remove the redundant exclude) — this is what available should be
  const { count: fixedCount, error: fixedErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null);
  console.log(`IS NULL only (fixed):   ${fixedCount ?? "null"}  error: ${fixedErr?.message ?? "none"}`);

  // 6. Missing-data query semantics: IS NULL AND missing data (what skip "Missing Data" should count)
  const buggyOr = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .or("company_name.is.null,company_name.eq,email.is.null,email.eq")
    .is("assigned_to", null);
  console.log(`Missing data buggy .or():  ${buggyOr.count ?? "null"}  error: ${(buggyOr.error as unknown as { message?: string } | null)?.message ?? "(none)"} (${JSON.stringify(buggyOr.error)})`);

  const fixedOr = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .or("company_name.is.null,email.is.null,company_name.eq.,email.eq.")
    .is("assigned_to", null);
  console.log(`Missing data or(empty):   ${fixedOr.count ?? "null"}  error: ${(fixedOr.error as unknown as { message?: string } | null)?.message ?? "(none)"} (${JSON.stringify(fixedOr.error)})`);

  const companyOnly = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null)
    .or("company_name.is.null,company_name.eq.");
  console.log(`Missing data (company only, unassigned): ${companyOnly.count ?? "null"}  error: ${(companyOnly.error as unknown as { message?: string } | null)?.message ?? "(none)"} (${JSON.stringify(companyOnly.error)})`);

  // 6b. Data quality: how many leads have empty/null company_name or email
  const { data: sample } = await admin
    .from("leads")
    .select("company_name, email, status, country, industry")
    .limit(5);
  console.log("Sample lead rows:", JSON.stringify(sample, null, 2));

  const { count: nullCompany } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .or("company_name.is.null,company_name.eq.");
  console.log(`company_name empty/null:  ${nullCompany ?? "null"}`);

  const { count: nullEmail } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .or("email.is.null,email.eq.");
  console.log(`email empty/null:        ${nullEmail ?? "null"}`);
}

main()
  .then(() => {
    console.log("\nDiagnostic complete (read-only).");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
