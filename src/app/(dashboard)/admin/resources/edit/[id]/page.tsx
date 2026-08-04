import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import { EditResourceForm } from "./edit-form";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: resource, error } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !resource) {
    notFound();
  }

  return <EditResourceForm resource={resource} />;
}
