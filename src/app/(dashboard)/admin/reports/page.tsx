import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

async function getReports(params: { partner?: string; from?: string; to?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("daily_reports")
    .select("*, partners!inner(company_id, profiles!inner(full_name))")
    .order("report_date", { ascending: false })
    .limit(200);

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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const reports = await getReports(sp);
  const partners = await getPartners();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          Daily Reports
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-3)]">
          View partner daily activity reports.
        </p>
      </div>

      {/* Filter */}
      <form className="surface p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="block text-[12px] font-semibold text-[var(--text-2)] mb-1.5">
            Partner
          </label>
          <select
            name="partner"
            defaultValue={sp.partner || ""}
            className="input-field"
          >
            <option value="">All Partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.profiles?.full_name} ({p.company_id})
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[12px] font-semibold text-[var(--text-2)] mb-1.5">
            From
          </label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from || ""}
            className="input-field"
          />
        </div>
        <div className="w-44">
          <label className="block text-[12px] font-semibold text-[var(--text-2)] mb-1.5">
            To
          </label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to || ""}
            className="input-field"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
      </form>

      {/* Reports table */}
      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No reports found"
          description="Partners have not submitted any reports matching these filters."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Partner</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell className="text-right">Contacted</TableHeaderCell>
              <TableHeaderCell className="text-right">Appointments</TableHeaderCell>
              <TableHeaderCell className="text-right">Deals Closed</TableHeaderCell>
              <TableHeaderCell>Challenge</TableHeaderCell>
              <TableHeaderCell>Notes</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium text-[var(--text-1)]">
                  {report.partners?.profiles?.full_name || "Unknown"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {report.report_date}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {report.leads_contacted}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {report.appointments_booked}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {report.deals_closed}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-[12px] text-[var(--text-3)]">
                  {report.biggest_challenge || "—"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-[12px] text-[var(--text-3)]">
                  {report.additional_notes || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
