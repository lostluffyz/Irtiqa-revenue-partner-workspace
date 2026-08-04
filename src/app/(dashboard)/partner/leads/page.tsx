import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/partner";
import { redirect } from "next/navigation";
import { LeadsTableWrapper } from "./leads-table-wrapper";
import type { Lead } from "@/types/database";

const PAGE_SIZE = 50;

async function getAssignedLeads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
  params: { search?: string; status?: string; page?: number },
) {
  const page = Math.max(1, params.page || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("assigned_to", partnerId);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    query = query.or(
      `company_name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to fetch leads:", error.message);
    return { leads: [], total: 0 };
  }

  return { leads: (data || []) as Lead[], total: count || 0 };
}

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const { partner, supabase } = await requirePartner().catch(() => {
    throw redirect("/login");
  });

  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);

  const { leads, total } = await getAssignedLeads(supabase, partner.id, {
    search: sp.search,
    status: sp.status,
    page,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Compute stat counts from the fetched leads
  const statCounts = {
    total: total,
    contacted: leads.filter((l) => l.status === "contacted").length,
    followUp: leads.filter((l) => l.status === "follow_up_required").length,
    appointments: leads.filter((l) => l.status === "appointment_booked").length,
  };

  return (
    <div>
      {/* Leads table with header, filter, list, and drawer */}
      <LeadsTableWrapper
        leads={leads}
        page={page}
        totalPages={totalPages}
        total={total}
        search={sp.search}
        status={sp.status}
        stats={statCounts}
      />
    </div>
  );
}
