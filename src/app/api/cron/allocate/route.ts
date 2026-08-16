import { NextResponse } from "next/server";
import { runAutomaticAllocation } from "@/lib/allocation";

// ============================================
// Vercel Cron: /api/cron/allocate
// ============================================
//
// Triggered daily at 06:00 UTC by vercel.json crons config.
// Protected by CRON_SECRET bearer token.
//
// The allocation runner is idempotent:
//   - Partner row lock serializes concurrent runs
//   - Automatic batch uniqueness prevents double-allocation per period
//   - FOR UPDATE SKIP LOCKED prevents lead double-claiming

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { adminClient } = await import("@/lib/supabase/admin");

    const result = await runAutomaticAllocation(adminClient, { dryRun: false });

    const totalAssigned = result.results.reduce((sum, r) => sum + r.assigned, 0);
    const eligibleCount = result.results.filter((r) => r.eligible).length;

    console.log(
      `[Cron] Allocation complete: ${totalAssigned} leads assigned to ${eligibleCount} partners, ${result.errors.length} errors`,
    );

    return NextResponse.json({
      success: true,
      assigned: totalAssigned,
      partners: eligibleCount,
      results: result.results,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[Cron] Allocation error:", err);
    return NextResponse.json(
      { error: "Allocation failed" },
      { status: 500 },
    );
  }
}
