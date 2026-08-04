import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";

export const metadata: Metadata = {
  title: "Admin Dashboard — Revenue Partner Workspace",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { profile, error } = await getProfile(supabase);

  if (error || !profile) {
    redirect("/login");
  }

  return (
    <AdminShell adminName={profile.full_name}>
      {children}
    </AdminShell>
  );
}
