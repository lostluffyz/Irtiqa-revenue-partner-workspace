"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  createResource,
  updateResource,
  deleteResource,
  ResourceSchema,
} from "@/lib/admin";

// ============================================
// Create Resource Action
// ============================================

export async function createResourceAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();

  const parsed = ResourceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    url: formData.get("url"),
    sortOrder: Number(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const result = await createResource(parsed.data);
  revalidatePath("/admin/resources");
  return result;
}

// ============================================
// Update Resource Action
// ============================================

export async function updateResourceAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing resource ID" };
  }

  const parsed = ResourceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    url: formData.get("url"),
    sortOrder: Number(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const result = await updateResource(id, parsed.data);
  revalidatePath("/admin/resources");
  return result;
}

// ============================================
// Delete Resource Action
// ============================================

export async function deleteResourceAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing resource ID" };
  }

  const result = await deleteResource(id);
  revalidatePath("/admin/resources");
  return result;
}
