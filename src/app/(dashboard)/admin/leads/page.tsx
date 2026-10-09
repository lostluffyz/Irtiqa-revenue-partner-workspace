import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { Upload } from "lucide-react";
import { LeadFilters, type ActivePartner } from "./lead-filters";
import { type Lead } from "./lead-table";
import { LeadsBulkAssign } from "./lead-bulk-assign";
import { LeadPageActions } from "./lead-page-actions";
import { PageHeader, StatCard, Separator, Button } from "@/components/ui";

const PAGE_SIZE = 50;

/* ═══════════════════════════════════════════════════════════════
   Server Queries — IDENTICAL to original
   ═══════════════════════════════════════════════════════════════ */
async function getLeads(params: {
  search?: string;
  status?: string;
  assignment?: string;
  partnerId?: string;
  page?: number;
}) {
  const supabase = await createClient();

  const page = Math.max(1, params.page || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("leads")
    .select("*, partners!left(company_id, profiles!inner(full_name))", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.assignment === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (params.assignment === "assigned") {
    query = query.not("assigned_to", "is", null);
  }

  if (params.partnerId) {
    query = query.eq("assigned_to", params.partnerId);
  }

  if (params.search) {
    query = query.or(
      `company_name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`,
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to fetch leads:", error.message);
    return { leads: [], total: 0 };
  }

  const mapped: Lead[] = (data || []).map((l: Record<string, unknown>) => ({
    ...l,
    partners: Array.isArray(l.partners) ? (l.partners as Array<Record<string, unknown>>)[0] : l.partners,
  })) as Lead[];

  return { leads: mapped, total: count || 0 };
}

async function getAggregateStats() {
  const supabase = await createClient();

  const [total, unassigned, contacted, followUp, appointmentsBooked] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).is("assigned_to", null),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "contacted"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "follow_up_required"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "appointment_booked"),
  ]);

  return {
    total: total.count ?? 0,
    unassigned: unassigned.count ?? 0,
    contacted: contacted.count ?? 0,
    followUp: followUp.count ?? 0,
    appointmentsBooked: appointmentsBooked.count ?? 0,
  };
}

async function getActivePartners() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("id, company_id, profiles!inner(full_name)")
    .eq("status", "active")
    .order("company_id");

  const activePartners: ActivePartner[] = (data || []).map((p: Record<string, unknown>) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? (p.profiles as Array<Record<string, unknown>>)[0] : p.profiles,
  })) as ActivePartner[];

  return activePartners;
}

/* ═══════════════════════════════════════════════════════════════
   Page Component — Uses design system components
   ═══════════════════════════════════════════════════════════════ */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    assignment?: string;
    partner?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);

  const [{ leads, total }, aggregateStats, activePartners] = await Promise.all([
    getLeads({
      search: sp.search,
      status: sp.status,
      assignment: sp.assignment,
      partnerId: sp.partner,
      page,
    }),
    getAggregateStats(),
    getActivePartners(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = !!(sp.search || (sp.status && sp.status !== "all") || (sp.assignment && sp.assignment !== "all") || sp.partner);

  return (
    <div className="animate-fade-in space-y-6">
      {/* ═══════════════════════════════════════════════════════════
          HEADER — PageHeader + CTA
          ═══════════════════════════════════════════════════════════ */}
      <PageHeader
        title="Leads"
        description="Pipeline management for your revenue partners"
        action={
          <div className="flex items-center gap-2">
            <LeadPageActions activePartners={activePartners} />
            <Link href="/admin/leads/upload">
              <Button size="sm" variant="secondary" className="dl-press min-h-[44px] md:min-h-0">
                <Upload className="h-3.5 w-3.5" />
                Upload CSV
              </Button>
            </Link>
          </div>
        }
      />

      {/* ═══════════════════════════════════════════════════════════
          STATS ROW — Pure numbers, no icons (consistent with Partners)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatCard value={aggregateStats.total} label="Total" />
        <StatCard value={aggregateStats.total - aggregateStats.unassigned} label="Assigned" />
        <StatCard
          value={aggregateStats.unassigned}
          label="Unassigned"
          valueClassName={aggregateStats.unassigned > 0 ? "text-[var(--status-warning)]" : ""}
        />
        <StatCard value={aggregateStats.contacted} label="Contacted" />
        <StatCard value={aggregateStats.appointmentsBooked} label="Appt. Booked" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FILTER + LIST
          ═══════════════════════════════════════════════════════════ */}
      <Separator />

      <LeadFilters
        total={aggregateStats.total}
        filteredCount={total}
        searchParams={{
          search: sp.search,
          status: sp.status,
          assignment: sp.assignment,
          partner: sp.partner,
        }}
        activePartners={activePartners}
      />

      <LeadsBulkAssign
        leads={leads}
        activePartners={activePartners}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        searchParams={{ search: sp.search, status: sp.status, assignment: sp.assignment, partner: sp.partner }}
      />
    </div>
  );
}
