import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PartnerShell } from "@/components/layout/partner-shell";

export const metadata: Metadata = {
  title: "Partner Dashboard — Revenue Partner Workspace",
};

export default async function PartnerLayout({
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
    <PartnerShell partnerName={profile.full_name}>
      {children}
    </PartnerShell>
  );
}
