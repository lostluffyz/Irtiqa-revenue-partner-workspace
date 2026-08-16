"use server";

import { requireAdmin, logAdminActivity } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runAutomaticAllocation, getAllocationReport, getPartnerAllocationState } from "@/lib/allocation";
import { revalidatePath } from "next/cache";

// ============================================
// Run Allocation (Manual Trigger)
// ============================================

export async function runAllocationAction(
  _prev: unknown,
  formData: FormData,
): Promise<{
  success: boolean;
  results?: { partnerId: string; partnerName: string; eligible: boolean; reason: string; assigned: number }[];
  errors?: string[];
  error?: string;
  dryRun?: boolean;
}> {
  try {
    const { profile } = await requireAdmin();
    const { adminClient } = await import("@/lib/supabase/admin");

    const dryRun = formData.get("dryRun") === "true";

    const result = await runAutomaticAllocation(adminClient, { dryRun });

    await logAdminActivity(await createClient(), dryRun ? "allocation_dry_run" : "allocation_run", {
      partnerCount: result.results.length,
      totalAssigned: result.results.reduce((sum, r) => sum + r.assigned, 0),
      errors: result.errors.length,
      dryRun,
      adminId: profile.id,
    });

    revalidatePath("/admin/allocation");

    return {
      success: true,
      results: result.results,
      errors: result.errors,
      dryRun,
    };
  } catch (err) {
    console.error("Allocation run error:", err);
    return { success: false, error: "Failed to run allocation" };
  }
}

// ============================================
// Approve Extra Leads
// ============================================

export async function approveExtraLeadsAction(
  _prev: unknown,
  formData: FormData,
): Promise<{
  success: boolean;
  newTotal?: number;
  error?: string;
}> {
  try {
    const { profile } = await requireAdmin();
    const { adminClient } = await import("@/lib/supabase/admin");

    const partnerId = formData.get("partnerId") as string;
    const quantity = parseInt(formData.get("quantity") as string, 10);
    const reason = (formData.get("reason") as string) || "";

    if (!partnerId) {
      return { success: false, error: "Partner ID is required" };
    }
    if (isNaN(quantity) || quantity <= 0) {
      return { success: false, error: "Quantity must be a positive number" };
    }

    const { data: newTotal, error: rpcErr } = await adminClient.rpc(
      "approve_extra_leads",
      {
        p_partner_id: partnerId,
        p_quantity: quantity,
        p_reason: reason,
        p_approved_by: profile.id,
      },
    );

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    await logAdminActivity(await createClient(), "extra_leads_approved", {
      partnerId,
      quantity,
      reason,
      newTotal,
      adminId: profile.id,
    });

    revalidatePath("/admin/allocation");
    revalidatePath(`/admin/partners/${partnerId}`);

    return { success: true, newTotal: newTotal as number };
  } catch (err) {
    console.error("Approve extra leads error:", err);
    return { success: false, error: "Failed to approve extra leads" };
  }
}

// ============================================
// Get Allocation Report
// ============================================

export async function getAllocationReportAction() {
  try {
    await requireAdmin();
    const { adminClient } = await import("@/lib/supabase/admin");
    return await getAllocationReport(adminClient);
  } catch (err) {
    console.error("Allocation report error:", err);
    return { rows: [], error: "Failed to fetch allocation report" };
  }
}

// ============================================
// Get Partner Allocation State
// ============================================

export async function getPartnerAllocationStateAction(partnerId: string) {
  try {
    await requireAdmin();
    const { adminClient } = await import("@/lib/supabase/admin");
    return await getPartnerAllocationState(adminClient, partnerId);
  } catch (err) {
    console.error("Partner allocation state error:", err);
    return { state: null, batches: [], error: "Failed to fetch partner allocation state" };
  }
}
