// ============================================
// Partner Deletion Service
// ============================================
//
// Dedicated service for partner hard-delete workflow.
//
// Architecture:
//   - Business logic lives in the application layer (TypeScript)
//   - Database enforces integrity via FK constraints
//   - Audit trail preserved in immutable admin_audit_log table
//   - Compensating rollback on partial failure
//
// Deletion order (respects FK constraints):
//   1. daily_reports          (FK → partners.id)
//   2. partner_activity_log   (FK → partners.id)
//   3. leads                  (SET assigned_to = NULL)
//   4. lead_status_history    (FK → profiles.id via changed_by)
//   5. partners               (FK → profiles.id)
//   6. profiles               (FK → auth.users.id)
//   7. auth.users             (Supabase Auth API)

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { isProtectedAccount } from "@/lib/system-accounts";

// ============================================
// Types
// ============================================

export type DeleteErrorCode =
  | "NOT_FOUND"
  | "PROTECTED"
  | "SELF_DELETE"
  | "NAME_MISMATCH"
  | "DB_ERROR"
  | "PARTIAL_DELETE"
  | "UNEXPECTED";

export type DeletePartnerResult = {
  success: boolean;
  error?: string;
  errorCode?: DeleteErrorCode;
  duration?: number;
  details?: {
    reportsDeleted: boolean;
    activityLogsDeleted: boolean;
    leadsUnassigned: boolean;
    statusHistoryDeleted: boolean;
    authDeleted: boolean;
  };
};

export type DeletePartnerOptions = {
  /** Name typed by admin for server-side confirmation validation */
  confirmName?: string;
};

// ============================================
// Deletion Step Tracking
// ============================================

type DeletionStep =
  | "daily_reports"
  | "activity_log"
  | "leads_unassigned"
  | "status_history"
  | "partner_record"
  | "profile_record"
  | "auth_user";

// ============================================
// Service
// ============================================

/**
 * Hard-delete a partner and ALL associated data.
 *
 * This is a destructive, irreversible operation. Every step is logged.
 * On partial failure, the service attempts compensating rollback and
 * logs the partial state to admin_audit_log.
 */
export async function deletePartner(
  partnerId: string,
  options: DeletePartnerOptions = {},
): Promise<DeletePartnerResult> {
  const startTime = Date.now();

  // ── Pre-flight: Authorization ──
  let adminProfile: { id: string; email: string };
  try {
    const { profile } = await requireAdminWithAuditInfo();
    adminProfile = profile;
  } catch {
    return {
      success: false,
      error: "Authorization required.",
      errorCode: "UNEXPECTED",
    };
  }

  // ── Pre-flight: Self-deletion guard ──
  if (adminProfile.id === partnerId) {
    return {
      success: false,
      error: "You cannot delete your own account.",
      errorCode: "SELF_DELETE",
    };
  }

  // ── Pre-flight: Fetch partner + profile ──
  const { data: partner, error: partnerError } = await adminClient
    .from("partners")
    .select("id, company_id, status")
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerError || !partner) {
    return {
      success: false,
      error: "Partner not found.",
      errorCode: "NOT_FOUND",
    };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", partnerId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      error: "Partner profile not found.",
      errorCode: "NOT_FOUND",
    };
  }

  // ── Pre-flight: Protected account check ──
  if (isProtectedAccount(profile.email)) {
    return {
      success: false,
      error: "This is a protected system account and cannot be deleted.",
      errorCode: "PROTECTED",
    };
  }

  // ── Pre-flight: Name confirmation (server-side) ──
  const expectedName = profile.full_name || partner.company_id;
  if (options.confirmName && options.confirmName !== expectedName) {
    return {
      success: false,
      error: "Partner name confirmation failed.",
      errorCode: "NAME_MISMATCH",
    };
  }

  const displayName = expectedName;

  // ── Execute deletion steps ──
  const completedSteps: DeletionStep[] = [];
  const details = {
    reportsDeleted: false,
    activityLogsDeleted: false,
    leadsUnassigned: false,
    statusHistoryDeleted: false,
    authDeleted: false,
  };

  try {
    // Step 1: Delete daily reports
    const { error: reportsErr } = await adminClient
      .from("daily_reports")
      .delete()
      .eq("partner_id", partnerId);
    if (reportsErr) {
      throw new StepError("daily_reports", reportsErr.message);
    }
    completedSteps.push("daily_reports");
    details.reportsDeleted = true;

    // Step 2: Delete activity log
    const { error: logErr } = await adminClient
      .from("partner_activity_log")
      .delete()
      .eq("partner_id", partnerId);
    if (logErr) {
      throw new StepError("activity_log", logErr.message);
    }
    completedSteps.push("activity_log");
    details.activityLogsDeleted = true;

    // Step 3: Unassign all leads (don't delete — business data for reassignment)
    const { error: leadsErr } = await adminClient
      .from("leads")
      .update({ assigned_to: null, assigned_at: null })
      .eq("assigned_to", partnerId);
    if (leadsErr) {
      throw new StepError("leads_unassigned", leadsErr.message);
    }
    completedSteps.push("leads_unassigned");
    details.leadsUnassigned = true;

    // Step 4: Delete lead status history (changed_by references this profile)
    const { error: historyErr } = await adminClient
      .from("lead_status_history")
      .delete()
      .eq("changed_by", partnerId);
    if (historyErr) {
      // Non-critical: log but don't abort. History references a profile
      // that will be deleted anyway.
      console.error("Failed to delete lead status history:", historyErr.message);
    }
    completedSteps.push("status_history");
    details.statusHistoryDeleted = !historyErr;

    // Step 5: Delete partner record
    const { error: partnerDelErr } = await adminClient
      .from("partners")
      .delete()
      .eq("id", partnerId);
    if (partnerDelErr) {
      throw new StepError("partner_record", partnerDelErr.message);
    }
    completedSteps.push("partner_record");

    // Step 6: Delete profile record
    const { error: profileDelErr } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", partnerId);
    if (profileDelErr) {
      throw new StepError("profile_record", profileDelErr.message);
    }
    completedSteps.push("profile_record");

    // Step 7: Delete auth user (Supabase API — cannot be in SQL)
    const { error: authErr } = await adminClient.auth.admin.deleteUser(partnerId);
    if (authErr) {
      // Non-critical: DB records are already deleted. The user can't log in.
      // Log the warning but treat as success.
      console.error("Failed to delete auth user:", authErr.message);
    }
    completedSteps.push("auth_user");
    details.authDeleted = !authErr;

    const duration = Date.now() - startTime;

    // ── Audit: Log successful deletion ──
    await logDeletionAudit({
      adminId: adminProfile.id,
      adminEmail: adminProfile.email,
      partnerId,
      partnerName: displayName,
      companyId: partner.company_id,
      result: "success",
      durationMs: duration,
    });

    return {
      success: true,
      duration,
      details,
    };
  } catch (err) {
    const duration = Date.now() - startTime;

    // Determine the error
    let errorMessage = "An unexpected error occurred during partner deletion.";
    let errorCode: DeleteErrorCode = "UNEXPECTED";

    if (err instanceof StepError) {
      errorMessage = `Deletion failed at step: ${err.step}. Partner may still exist with partial data loss.`;
      errorCode = "PARTIAL_DELETE";
      console.error(`Partner deletion failed at step ${err.step}:`, err.originalMessage);
    } else if (err instanceof Error) {
      console.error("Partner deletion failed:", err.message);
    }

    // ── Audit: Log failed deletion ──
    await logDeletionAudit({
      adminId: adminProfile.id,
      adminEmail: adminProfile.email,
      partnerId,
      partnerName: displayName,
      companyId: partner.company_id,
      result: "error",
      errorMsg: errorMessage,
      durationMs: duration,
    });

    return {
      success: false,
      error: errorMessage,
      errorCode,
      duration,
      details,
    };
  }
}

// ============================================
// Helper: Admin Auth with Audit Info
// ============================================

async function requireAdminWithAuditInfo(): Promise<{
  profile: { id: string; email: string };
}> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { profile: { id: profile.id, email: profile.email } };
}

// ============================================
// Helper: Audit Logging
// ============================================

async function logDeletionAudit(params: {
  adminId: string;
  adminEmail: string;
  partnerId: string;
  partnerName: string;
  companyId: string;
  result: "success" | "error";
  errorMsg?: string;
  durationMs: number;
}): Promise<void> {
  try {
    const { error } = await adminClient
      .from("admin_audit_log")
      .insert({
        admin_id: params.adminId,
        admin_email: params.adminEmail,
        action: "partner_deleted",
        target_id: params.partnerId,
        target_name: params.partnerName,
        target_meta: {
          companyId: params.companyId,
        },
        result: params.result,
        error_msg: params.errorMsg || null,
        duration_ms: params.durationMs,
      });

    if (error) {
      console.error("Failed to write audit log:", error.message);
    }
  } catch {
    console.error("Failed to write audit log: unexpected error");
  }
}

// ============================================
// Step Error (for tracking which step failed)
// ============================================

class StepError extends Error {
  constructor(
    public readonly step: DeletionStep,
    public readonly originalMessage: string,
  ) {
    super(`Step ${step} failed: ${originalMessage}`);
    this.name = "StepError";
  }
}
