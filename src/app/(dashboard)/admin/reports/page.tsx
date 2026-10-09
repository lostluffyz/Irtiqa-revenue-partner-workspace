import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getBusinessDate } from "@/lib/program-timezone";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyContentCard } from "@/components/cards/content-cards";
import { ChevronDown, FileText, Phone, CalendarCheck, Handshake, Search } from "lucide-react";
import { ReportsTable, type ReportRow } from "./reports-table";
import { REPORTS_LIMIT, summarizeReports, isResultCapped } from "./report-utils";

async function getReports(params: { partner?: string; from?: string; to?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("daily_reports")
    .select("*, partners!inner(company_id, profiles!inner(full_name))")
    .order("report_date", { ascending: false })
    .limit(REPORTS_LIMIT);

  if (params.partner) {
    query = query.eq("partner_id", params.partner);
  }

  if (params.from) {
    query = query.gte("report_date", params.from);
  }

  if (params.to) {
    query = query.lte("report_date", params.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch reports:", error.message);
    return [];
  }

  return (data || []).map((r) => ({
    ...r,
    partners: Array.isArray(r.partners) ? r.partners[0] : r.partners,
  }));
}

async function getPartners() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("id, company_id, profiles!inner(full_name)")
    .order("company_id");

  return (data || []).map((p) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));
}

const CONTROL_CLASS =
  "h-[44px] w-full min-w-0 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text-1)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:[box-shadow:0_0_0_3px_var(--focus-ring)]";

const LABEL_CLASS = "mb-1.5 block text-[13px] font-medium text-[var(--text-2)]";

const APPLY_CLASS =
  "inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[var(--accent)] px-5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

const CLEAR_CLASS =
  "inline-flex h-[44px] items-center justify-center rounded-[12px] px-5 text-[14px] font-medium text-[var(--text-2)] transition-colors duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const reports = await getReports(sp);
  const partners = await getPartners();
  const todayStr = getBusinessDate();
  const hasFilters = Boolean(sp.partner || sp.from || sp.to);
  const summary = summarizeReports(reports);
  const capped = isResultCapped(reports.length);

  const rows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    partner_id: r.partner_id,
    report_date: r.report_date,
    leads_contacted: r.leads_contacted,
    appointments_booked: r.appointments_booked,
    deals_closed: r.deals_closed,
    biggest_challenge: r.biggest_challenge,
    additional_notes: r.additional_notes,
    created_at: r.created_at ?? null,
    partnerName: r.partners?.profiles?.full_name || "Unknown",
    companyId: r.partners?.company_id ?? null,
  }));

  const tiles = [
    { label: "Reports", value: summary.count, icon: FileText },
    { label: "Contacted", value: summary.contacted, icon: Phone },
    { label: "Appointments", value: summary.appointments, icon: CalendarCheck },
    { label: "Deals closed", value: summary.deals, icon: Handshake },
  ];

  return (
    <div>
      <PageHeader
        title="Daily Reports"
        description="Review what each partner submitted every day."
      />

      {/* ── Filter bar ── */}
      <form
        method="GET"
        className="mt-6 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
      >
        <div className="grid grid-cols-1 gap-3 md:flex md:items-end md:gap-3">
          <div className="min-w-0 md:w-56 md:shrink-0">
            <label htmlFor="report-filter-partner" className={LABEL_CLASS}>
              Partner
            </label>
            <div className="relative">
              <select
                id="report-filter-partner"
                name="partner"
                defaultValue={sp.partner || ""}
                className={`${CONTROL_CLASS} appearance-none pr-9`}
              >
                <option value="">All Partners</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.profiles?.full_name} ({p.company_id})
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-3">
            <div className="min-w-0 md:w-40">
              <label htmlFor="report-filter-from" className={LABEL_CLASS}>
                From
              </label>
              <input
                id="report-filter-from"
                type="date"
                name="from"
                defaultValue={sp.from || ""}
                className={`${CONTROL_CLASS} tabular-nums`}
              />
            </div>
            <div className="min-w-0 md:w-40">
              <label htmlFor="report-filter-to" className={LABEL_CLASS}>
                To
              </label>
              <input
                id="report-filter-to"
                type="date"
                name="to"
                defaultValue={sp.to || ""}
                className={`${CONTROL_CLASS} tabular-nums`}
              />
            </div>
          </div>
          <div className={`grid gap-3 md:flex md:shrink-0 md:gap-2 ${hasFilters ? "grid-cols-2" : "grid-cols-1"}`}>
            <button type="submit" className={APPLY_CLASS}>
              Apply
            </button>
            {hasFilters && (
              <Link href="/admin/reports" className={CLEAR_CLASS}>
                Clear
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* ── Result count ── */}
      <p className="mt-3 text-[13px] text-[var(--text-3)]">
        Showing {reports.length} report{reports.length === 1 ? "" : "s"}
        {capped && (
          <> · Showing the latest {REPORTS_LIMIT}. Narrow the date range to see older reports.</>
        )}
      </p>

      {reports.length === 0 ? (
        <div className="mt-4">
          {hasFilters ? (
            <EmptyContentCard
              icon={<Search className="h-7 w-7" />}
              title="No reports match these filters"
              body="Try a wider date range or another partner."
              action={
                <Link href="/admin/reports">
                  <Button size="sm" variant="secondary" className="min-h-[44px]">
                    Clear filters
                  </Button>
                </Link>
              }
            />
          ) : (
            <EmptyContentCard
              icon={<FileText className="h-7 w-7" />}
              title="No daily reports yet"
              body="Reports appear here once partners submit them."
            />
          )}
        </div>
      ) : (
        <>
          {/* ── Summary tiles ── */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--hover-bg)] text-[var(--text-2)]">
                  <tile.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[20px] font-semibold leading-none tabular-nums text-[var(--text-1)]">
                    {tile.value.toLocaleString("en-US")}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-[var(--text-3)]">{tile.label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-3)]">
            Totals reflect the reports shown above.
          </p>

          {/* ── Table (desktop) + cards (mobile) ── */}
          <div className="mt-4">
            <ReportsTable rows={rows} todayStr={todayStr} />
          </div>
        </>
      )}
    </div>
  );
}
