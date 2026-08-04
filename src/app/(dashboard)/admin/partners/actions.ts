"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  CreatePartnerSchema,
  ResetPasswordSchema,
  UpdatePartnerStatusSchema,
  UpdatePartnerRegionSchema,
  DeletePartnerSchema,
  createPartner,
  resetPartnerPassword,
  updatePartnerStatus,
  updatePartnerRegion,
} from "@/lib/admin";
import { deletePartner } from "@/lib/partner-deletion-service";

// ============================================
// Partner Creation Action
// ============================================

export async function createPartnerAction(
  prev: { error?: string; success?: boolean; companyId?: string; password?: string } | null,
  formData: FormData,
) {
  await requireAdmin();

  const parsed = CreatePartnerSchema.safeParse({
    fullName: formData.get("fullName"),
    regionId: formData.get("regionId"),
    phone: formData.get("phone") || "",
    initialPassword: formData.get("initialPassword") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Password will be generated if not provided
  const result = await createPartner(parsed.data);
  revalidatePath("/admin/partners");
  return result;
}

// ============================================
// Password Reset Action
// ============================================

export async function resetPasswordAction(
  prev: { error?: string; newPassword?: string } | null,
  formData: FormData,
) {
  await requireAdmin();

  const parsed = ResetPasswordSchema.safeParse({
    partnerId: formData.get("partnerId"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const result = await resetPartnerPassword(
    parsed.data.partnerId,
    parsed.data.newPassword,
  );
  revalidatePath("/admin/partners");
  return result;
}

// ============================================
// Partner Status Update Action
// ============================================

export async function updatePartnerStatusAction(
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();

  const parsed = UpdatePartnerStatusSchema.safeParse({
    partnerId: formData.get("partnerId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const result = await updatePartnerStatus(parsed.data.partnerId, parsed.data.status);
  revalidatePath("/admin/partners");
  return result;
}

// ============================================
// Partner Region Update Action
// ============================================

export async function updatePartnerRegionAction(
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();

  const parsed = UpdatePartnerRegionSchema.safeParse({
    partnerId: formData.get("partnerId"),
    regionId: formData.get("regionId"),
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const result = await updatePartnerRegion(parsed.data.partnerId, parsed.data.regionId);
  revalidatePath("/admin/partners");
  return result;
}

// ============================================
// Partner Deletion Action
// ============================================

export async function deletePartnerAction(
  _prev: { error?: string; success?: boolean; duration?: number } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; duration?: number }> {
  await requireAdmin();

  const parsed = DeletePartnerSchema.safeParse({
    partnerId: formData.get("partnerId"),
    partnerName: formData.get("partnerName") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const result = await deletePartner(parsed.data.partnerId, {
    confirmName: parsed.data.partnerName,
  });

  revalidatePath("/admin/partners");

  if (result.success) {
    return { success: true, duration: result.duration };
  }

  return { error: result.error, duration: result.duration };
}
