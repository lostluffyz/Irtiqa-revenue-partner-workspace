import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PartnerFilters, type FilterRegion } from "./partner-filters";
import { PartnerList, PartnersEmptyState } from "./partner-table";
import { PageHeader, StatCard, Separator, Button } from "@/components/ui";
import { getBusinessDate } from "@/lib/program-timezone";
import type { ReportStatus } from "@/lib/compliance";

/* ═══════════════════════════════════════════════════════════════
   Server Queries — IDENTICAL to previous version
   ═══════════════════════════════════════════════════════════════ */
async function getPartners(search?: string, status?: string, region?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("partners")
    .select(`
      *,
      profiles!inner(id, full_name, email, is_active),
      regions!left(name, id)
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (region) {
    query = query.eq("region_id", region);
  }

  if (search) {
    query = query.or(
      `company_id.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch partners:", error.message);
    return { partners: [], total: 0 };
  }

  const partnerIds = data.map((p) => p.id);
  const leadCounts: Record<string, number> = {};
  const reportStatusMap: Record<string, ReportStatus> = {};

  if (partnerIds.length > 0) {
    const [leadCountsResult, reportsResult] = await Promise.all([
      supabase
        .from("leads")
        .select("assigned_to")
        .in("assigned_to", partnerIds),
      supabase
        .from("daily_reports")
        .select("partner_id, report_date")
        .in("partner_id", partnerIds)
        .eq("report_date", getBusinessDate()),
    ]);

    if (leadCountsResult.data) {
      for (const lead of leadCountsResult.data) {
        if (lead.assigned_to) {
          leadCounts[lead.assigned_to] = (leadCounts[lead.assigned_to] || 0) + 1;
        }
      }
    }

    if (reportsResult.data) {
      for (const report of reportsResult.data) {
        reportStatusMap[report.partner_id] = "submitted";
      }
    }
  }

  // Compute pending/overdue based on current time
  const { evaluateDeadline } = await import("@/lib/compliance");
  const { isOverdue } = evaluateDeadline();

  const mapped = data.map((p) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
    regions: Array.isArray(p.regions) ? p.regions[0] : p.regions,
    leadCount: leadCounts[p.id] || 0,
    reportStatus: reportStatusMap[p.id] || (isOverdue ? "overdue" as const : "pending" as const),
  }));

  return { partners: mapped, total: mapped.length };
}

async function getAggregateStats() {
  const supabase = await createClient();

  const [total, active, inactive, suspended, withLeads] = await Promise.all([
    supabase.from("partners").select("id", { count: "exact", head: true }),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "inactive"),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("leads").select("assigned_to", { count: "exact", head: true }).not("assigned_to", "is", null),
  ]);

  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    inactive: inactive.count ?? 0,
    suspended: suspended.count ?? 0,
    withLeads: withLeads.count ?? 0,
  };
}

async function getRegions(): Promise<FilterRegion[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("regions").select("id, name").order("name");
  return (data || []).map((r) => ({ id: r.id, name: r.name }));
}

/* ═══════════════════════════════════════════════════════════════
   Page Component — Uses new design system components
   ═══════════════════════════════════════════════════════════════ */
export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    region?: string;
  }>;
}) {
  await requireAdmin();

  const sp = await searchParams;

  try {
    const [{ partners, total }, aggregateStats, regions] = await Promise.all([
      getPartners(sp.search, sp.status, sp.region),
      getAggregateStats(),
      getRegions(),
    ]);

    const hasActiveFilters = !!(sp.search || (sp.status && sp.status !== "all") || sp.region);

    return (
    <div className="animate-fade-in space-y-6">
      {/* ═══════════════════════════════════════════════════════════
          HEADER — PageHeader + CTA
          ═══════════════════════════════════════════════════════════ */}
      <PageHeader
        title="Partners"
        description="Manage your revenue partner network, track assignments, and monitor performance."
        action={
          <Link href="/admin/partners/create">
            <Button size="sm" className="dl-press">
              <UserPlus className="h-3.5 w-3.5" />
              Add Partner
            </Button>
          </Link>
        }
      />

      {/* ═══════════════════════════════════════════════════════════
          STATS ROW — Pure numbers, no icons
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={aggregateStats.total} label="Total" />
        <StatCard value={aggregateStats.active} label="Active" />
        <StatCard value={aggregateStats.withLeads} label="Leads Assigned" sub="Across all partners" />
        <StatCard
          value={aggregateStats.inactive + aggregateStats.suspended}
          label="Needs Attention"
          sub="Inactive + suspended"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FILTER + LIST
          ═══════════════════════════════════════════════════════════ */}
      <Separator />

      <PartnerFilters
        total={aggregateStats.total}
        filteredCount={total}
        activeCount={aggregateStats.active}
        inactiveCount={aggregateStats.inactive}
        suspendedCount={aggregateStats.suspended}
        searchParams={{
          search: sp.search,
          status: sp.status,
          region: sp.region,
        }}
        regions={regions}
      />

      {partners.length === 0 ? (
        <PartnersEmptyState hasFilters={hasActiveFilters} />
      ) : (
        <PartnerList partners={partners} regions={regions} />
      )}
    </div>
  );
  } catch (error) {
    console.error("[Partners] page error:", error);
    throw error;
  }
}
