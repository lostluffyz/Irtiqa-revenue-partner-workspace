"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  AnnouncementSchema,
} from "@/lib/admin";

// ============================================
// Create Announcement Action
// ============================================

export async function createAnnouncementAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();

  const parsed = AnnouncementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    isPinned: formData.get("isPinned") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const result = await createAnnouncement(parsed.data);
  revalidatePath("/admin/announcements");
  return result;
}

// ============================================
// Update Announcement Action
// ============================================

export async function updateAnnouncementAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing announcement ID" };
  }

  const parsed = AnnouncementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    isPinned: formData.get("isPinned") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const result = await updateAnnouncement(id, parsed.data);
  revalidatePath("/admin/announcements");
  return result;
}

// ============================================
// Delete Announcement Action
// ============================================

export async function deleteAnnouncementAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing announcement ID" };
  }

  const result = await deleteAnnouncement(id);
  revalidatePath("/admin/announcements");
  return result;
}
