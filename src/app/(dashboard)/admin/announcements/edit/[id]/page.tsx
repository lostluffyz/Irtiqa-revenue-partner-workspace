import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import { EditAnnouncementForm } from "./edit-form";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !announcement) {
    notFound();
  }

  return <EditAnnouncementForm announcement={announcement} />;
}
