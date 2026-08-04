// ============================================
// Admin Authorization & Actions
// ============================================
//
// Every privileged admin Server Action must call requireAdmin()
// BEFORE using the admin client (secret key) to authorize the request.
//
// The presence of SUPABASE_SECRET_KEY does NOT authorize a request.
// Authorization comes from the authenticated user's session + role.

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getBusinessDate } from "@/lib/program-timezone";
import { z } from "zod";
import type { Profile } from "@/types/database";

export type AdminAuthResult = {
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Require the current request user is an authenticated admin.
 * Must be called at the start of every privileged Server Action.
 *
 * Returns the admin profile + authenticated Supabase client for RLS-bound queries.
 * Throws if unauthenticated or not an admin.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { profile: profile as unknown as Profile, supabase };
}

// ============================================
// Activity Logging Helper
// ============================================

export async function logAdminActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  details?: Record<string, unknown>,
) {
  // We use admin client to insert into the activity log since
  // we're already authorized via requireAdmin()
  const { error } = await adminClient
    .from("partner_activity_log")
    .insert({
      action,
      partner_id: "", // admin actions use empty partner_id
      details: details ?? null,
    });

  if (error) {
    console.error("Failed to log activity:", error.message);
  }
}

// ============================================
// Zod Schemas & Validation
// ============================================

export const CreatePartnerSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  regionId: z.string().uuid("Region is required"),
  phone: z.string().optional().default(""),
  initialPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional(),
});

export const ResetPasswordSchema = z.object({
  partnerId: z.string().uuid(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const UpdatePartnerStatusSchema = z.object({
  partnerId: z.string().uuid(),
  status: z.enum(["active", "inactive", "suspended"]),
});

export const UpdatePartnerRegionSchema = z.object({
  partnerId: z.string().uuid(),
  regionId: z.string().uuid(),
});

export const DeletePartnerSchema = z.object({
  partnerId: z.string().uuid("Invalid partner ID"),
  partnerName: z.string().optional(),
});

export const LeadAssignmentSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  partnerId: z.string().uuid(),
});

// CSV Upload helpers

export const CSV_EXPECTED_HEADERS = [
  "company_name",
  "website",
  "phone",
  "email",
  "industry",
  "country",
  "internal_notes",
] as const;

export type CsvRow = Record<string, string>;

export function validateCsvHeaders(headers: string[]): string | null {
  const required = ["company_name"];
  for (const r of required) {
    if (!headers.includes(r)) {
      return `Missing required column: ${r}. Required: ${required.join(", ")}`;
    }
  }
  return null;
}

export function validateCsvRow(row: CsvRow): string | null {
  if (!row.company_name || row.company_name.trim().length === 0) {
    return "company_name is required";
  }
  if (row.company_name.trim().length > 500) {
    return "company_name exceeds 500 characters";
  }
  if (row.website && row.website.length > 500) {
    return "website exceeds 500 characters";
  }
  if (row.email && row.email.length > 320) {
    return "email exceeds 320 characters";
  }
  if (row.phone && row.phone.length > 50) {
    return "phone exceeds 50 characters";
  }
  if (row.industry && row.industry.length > 200) {
    return "industry exceeds 200 characters";
  }
  if (row.country && row.country.length > 200) {
    return "country exceeds 200 characters";
  }
  return null;
}

// ============================================
// Password Generation
// ============================================

import { randomBytes } from "crypto";

export function generateTemporaryPassword(length = 16): string {
  return randomBytes(length)
    .toString("base64")
    .replace(/[^a-zA-Z0-9!@#$%^&*]/g, "")
    .slice(0, length);
}

// ============================================
// Partner Creation
// ============================================

export type CreatePartnerResult = {
  success: boolean;
  companyId?: string;
  password?: string;
  error?: string;
};

export async function createPartner(
  input: z.infer<typeof CreatePartnerSchema>,
): Promise<CreatePartnerResult> {
  // 1. Authorize
  await requireAdmin();

  const password = input.initialPassword || generateTemporaryPassword();

  // 2. Generate Company ID
  const { data: idResult, error: idError } = await adminClient.rpc("generate_company_id");
  if (idError || !idResult) {
    console.error("Company ID generation failed:", idError?.message);
    return { success: false, error: "Failed to generate Company ID" };
  }
  const companyId = idResult as string;

  // 3. Create auth user via admin API
  const authEmail = `${companyId.toLowerCase()}@rp.irtiqa.internal`;

  const { data: authUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: "partner",
    },
  });

  if (createAuthError || !authUser.user) {
    console.error("Auth creation failed:", createAuthError?.message);
    return { success: false, error: createAuthError?.message || "Failed to create user" };
  }

  const userId = authUser.user.id;

  try {
    // 4. Ensure profile has partner role
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email: authEmail,
        full_name: input.fullName,
        role: "partner",
        is_active: true,
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile upsert failed:", profileError.message);
      // Cleanup: remove the auth user
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
      return { success: false, error: "Failed to create profile" };
    }

    // 5. Create partner record with program start date
    const { error: partnerError } = await adminClient
      .from("partners")
      .insert({
        id: userId,
        company_id: companyId,
        region_id: input.regionId || null,
        phone: input.phone || null,
        status: "active",
        program_start_date: getBusinessDate(),
      });

    if (partnerError) {
      console.error("Partner insert failed:", partnerError.message);
      // Cleanup: remove auth user and profile
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
      return { success: false, error: "Failed to create partner record" };
    }

    // 6. Log activity
    await logAdminActivity(
      await createClient(),
      "partner_created",
      { companyId, partnerName: input.fullName },
    );

    return { success: true, companyId, password };
  } catch (err) {
    // Cleanup on unexpected failure
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    console.error("Partner creation failed:", err);
    return { success: false, error: "Unexpected error during partner creation" };
  }
}

// ============================================
// Password Reset
// ============================================

export type ResetPasswordResult = {
  success: boolean;
  newPassword?: string;
  error?: string;
};

export async function resetPartnerPassword(
  partnerId: string,
  newPassword?: string,
): Promise<ResetPasswordResult> {
  await requireAdmin();

  const password = newPassword || generateTemporaryPassword();

  const { error } = await adminClient.auth.admin.updateUserById(partnerId, {
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await logAdminActivity(await createClient(), "password_reset", { partnerId });

  return { success: true, newPassword: password };
}

// ============================================
// Partner Status Management
// ============================================

export async function updatePartnerStatus(
  partnerId: string,
  status: "active" | "inactive" | "suspended",
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await adminClient
    .from("partners")
    .update({ status })
    .eq("id", partnerId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Sync profile is_active with partner status
  const isActive = status === "active";
  await adminClient
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", partnerId);

  await logAdminActivity(await createClient(), "partner_status_changed", {
    partnerId,
    newStatus: status,
  });

  return { success: true };
}

// ============================================
// Partner Region Management
// ============================================

export async function updatePartnerRegion(
  partnerId: string,
  regionId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await adminClient
    .from("partners")
    .update({ region_id: regionId })
    .eq("id", partnerId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAdminActivity(await createClient(), "partner_region_changed", {
    partnerId,
    newRegionId: regionId,
  });

  return { success: true };
}

// ============================================
// Lead Assignment (Single & Bulk)
// ============================================

export async function assignLeads(
  leadIds: string[],
  partnerId: string,
): Promise<{ success: boolean; assigned: number; errors: string[] }> {
  await requireAdmin();

  // Validate batch size
  if (leadIds.length > 500) {
    return { success: false, assigned: 0, errors: ["Maximum batch size is 500 leads"] };
  }

  // Validate partner exists and is active
  const { data: partner, error: partnerError } = await adminClient
    .from("partners")
    .select("id, status")
    .eq("id", partnerId)
    .single();

  if (partnerError || !partner) {
    return { success: false, assigned: 0, errors: ["Partner not found"] };
  }

  if (partner.status !== "active") {
    return { success: false, assigned: 0, errors: ["Partner is not active"] };
  }

  const errors: string[] = [];
  let assigned = 0;

  for (const leadId of leadIds) {
    const { error } = await adminClient
      .from("leads")
      .update({
        assigned_to: partnerId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) {
      errors.push(`Lead ${leadId}: ${error.message}`);
    } else {
      assigned++;
    }
  }

  await logAdminActivity(await createClient(), "leads_assigned", {
    count: assigned,
    partnerId,
  });

  return { success: errors.length === 0, assigned, errors };
}

// ============================================
// Announcement Management
// ============================================

export const AnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  content: z.string().min(1, "Content is required"),
  isPinned: z.boolean().optional().default(false),
});

export async function createAnnouncement(
  input: z.infer<typeof AnnouncementSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAdmin();

  const { error } = await adminClient.from("announcements").insert({
    title: input.title,
    content: input.content,
    is_pinned: input.isPinned,
    created_by: profile.id,
  });

  if (error) return { success: false, error: error.message };

  await logAdminActivity(await createClient(), "announcement_created", {
    title: input.title,
  });

  return { success: true };
}

export async function updateAnnouncement(
  id: string,
  input: z.infer<typeof AnnouncementSchema>,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await adminClient
    .from("announcements")
    .update({
      title: input.title,
      content: input.content,
      is_pinned: input.isPinned,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteAnnouncement(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await adminClient.from("announcements").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Resource Management
// ============================================

export const ResourceSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().optional().default(""),
  type: z.enum(["document", "link", "video", "faq"]),
  url: z.string().optional().default(""),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function createResource(
  input: z.infer<typeof ResourceSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAdmin();

  const { error } = await adminClient.from("resources").insert({
    title: input.title,
    description: input.description || null,
    type: input.type,
    url: input.url || null,
    file_path: null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
    created_by: profile.id,
  });

  if (error) return { success: false, error: error.message };

  await logAdminActivity(await createClient(), "resource_created", {
    title: input.title,
  });

  return { success: true };
}

export async function updateResource(
  id: string,
  input: z.infer<typeof ResourceSchema>,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await adminClient
    .from("resources")
    .update({
      title: input.title,
      description: input.description || null,
      type: input.type,
      url: input.url || null,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteResource(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await adminClient.from("resources").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
