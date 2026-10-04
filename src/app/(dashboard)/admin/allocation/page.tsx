"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAllocationReportAction, runAllocationAction, approveExtraLeadsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader, StatCard, Separator } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DEFAULT_WEEKLY_LEAD_LIMIT,
  DEFAULT_PROGRAM_LEAD_LIMIT,
  PROGRAM_DURATION_DAYS,
} from "@/lib/allocation";
import { formatShortMonthDay, formatShortDateRange } from "@/components/dashboard/helpers";

// ============================================
// Types (unchanged)
// ============================================

interface AllocationReportRow {
  partnerId: string;
  companyId: string;
  partnerName: string;
  status: string;
  programStartDate: string;
  programDay: number;
  programExpired: boolean;
  totalAssigned: number;
  effectiveProgramLimit: number;
  approvedExtraLeads: number;
  programCapacity: number;
  weeklyLimit: number;
  weeklyUsed: number;
  weeklyCapacity: number;
  periodStart: string;
  periodEnd: string;
  lastBatchAt: string | null;
  allocationEnabled: boolean;
}

// ============================================
// Small presentational pieces (no logic)
// ============================================

function Meter({ value, tone }: { value: number; tone: "accent" | "neutral" | "amber" }) {
  const fill =
    tone === "amber"
      ? "bg-[var(--status-warning)]"
      : tone === "accent"
        ? "bg-[var(--accent)]"
        : "bg-[var(--text-3)]";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${fill}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// ============================================
// Allocation Page
// ============================================

export default function AllocationPage() {
  const [report, setReport] = useState<AllocationReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    assigned: number;
    partners: number;
    errors: string[];
    dryRun?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Approve dialog state
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    partnerId: string;
    partnerName: string;
  }>({ open: false, partnerId: "", partnerName: "" });
  // Run-allocation confirm + trigger ref (focus returns to Run on close)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runBtnRef = useRef<HTMLButtonElement>(null);
  const [approveQuantity, setApproveQuantity] = useState("");
  const [approveReason, setApproveReason] = useState("");
  const [approving, setApproving] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAllocationReportAction();
    if (result.error) {
      setError(result.error);
    } else {
      setReport(result.rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const closeConfirm = () => {
    setConfirmOpen(false);
    runBtnRef.current?.focus();
  };

  const handleRun = async (dryRun: boolean) => {
    if (dryRun) {
      setDryRunning(true);
    } else {
      setRunning(true);
    }
    setError(null);
    setLastResult(null);

    const formData = new FormData();
    formData.set("dryRun", String(dryRun));
    const result = await runAllocationAction(null, formData);

    if (result.error) {
      setError(result.error);
    } else {
      setLastResult({
        assigned: result.results?.reduce((sum, r) => sum + r.assigned, 0) || 0,
        partners: result.results?.filter((r) => r.eligible).length || 0,
        errors: result.errors || [],
        dryRun: result.dryRun,
      });
    }

    setRunning(false);
    setDryRunning(false);
    if (!dryRun) fetchReport();
  };

  const handleApprove = async () => {
    if (!approveQuantity || parseInt(approveQuantity, 10) <= 0) return;
    setApproving(true);

    const formData = new FormData();
    formData.set("partnerId", approveDialog.partnerId);
    formData.set("quantity", approveQuantity);
    formData.set("reason", approveReason);

    const result = await approveExtraLeadsAction(null, formData);

    if (result.error) {
      setError(result.error);
    } else {
      setApproveDialog({ open: false, partnerId: "", partnerName: "" });
      setApproveQuantity("");
      setApproveReason("");
      fetchReport();
    }

    setApproving(false);
  };

  const closeApproveDialog = () =>
    setApproveDialog({ open: false, partnerId: "", partnerName: "" });

  // Summary figures derived only from the already-loaded report rows
  const partnersInProgram = report.length;
  const totalAssigned = report.reduce((sum, r) => sum + r.totalAssigned, 0);
  const atCapacity = report.filter((r) => r.programCapacity <= 0).length;
  const expiredCount = report.filter((r) => r.programExpired).length;
  const withRoom = report.filter((r) => r.programCapacity > 0).length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <PageHeader
        title="Lead Allocation"
        description="Automatic weekly assignment within program and weekly limits."
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRun(true)}
              disabled={running || dryRunning}
              className="w-full sm:w-auto min-h-[44px] md:min-h-0"
            >
              {dryRunning ? "Running..." : "Dry Run"}
            </Button>
            <Button
              ref={runBtnRef}
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={running || dryRunning}
              className="w-full sm:w-auto min-h-[44px] md:min-h-0"
            >
              {running ? "Running..." : "Run Allocation"}
            </Button>
          </div>
        }
      />

      {/* Policy strip — same values as before, compact chips */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Allocation policy">
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] text-[var(--text-2)] tabular-nums">
          {DEFAULT_WEEKLY_LEAD_LIMIT} leads / partner / week
        </span>
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] text-[var(--text-2)] tabular-nums">
          {DEFAULT_PROGRAM_LEAD_LIMIT} normal capacity
        </span>
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] text-[var(--text-2)] tabular-nums">
          {PROGRAM_DURATION_DAYS}-day program
        </span>
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] text-[var(--text-2)]">
          Auto-run Monday 06:00 UTC
        </span>
      </div>

      {/* Summary KPIs — computed from loaded rows only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatCard value={partnersInProgram} label="In Program" sub="Active + inactive" />
        <StatCard value={totalAssigned} label="Leads Assigned" sub="Across program" />
        <StatCard
          value={atCapacity}
          label="At Capacity"
          sub="No room left"
          valueClassName={atCapacity > 0 ? "text-[var(--status-warning)]" : ""}
        />
        <StatCard value={expiredCount} label="Expired" sub="Program ended" />
      </div>

      <Separator />

      {/* Result banner */}
      {lastResult && (
        <div
          className={`rounded-[10px] border p-4 ${
            lastResult.errors.length > 0
              ? "border-[var(--status-warning)]/25 bg-[var(--status-warning-bg)]"
              : "border-[var(--status-success)]/25 bg-[var(--status-success-bg)]"
          }`}
          role="status"
        >
          <p className="font-medium text-sm text-[var(--text-1)]">
            {lastResult.dryRun ? "Dry Run" : "Allocation"} Complete
          </p>
          <p className="text-sm text-[var(--text-2)] mt-1 tabular-nums">
            {lastResult.partners} partners • {lastResult.assigned} leads assigned
            {lastResult.errors.length > 0 && ` • ${lastResult.errors.length} errors`}
          </p>
          {lastResult.errors.length > 0 && (
            <ul className="mt-2 text-xs text-[var(--status-warning)] list-disc list-inside">
              {lastResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div
          className="rounded-[10px] border border-[var(--status-danger)]/25 bg-[var(--status-danger-bg)] p-4 text-sm text-[var(--status-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Report */}
      {loading ? (
        <div className="surface overflow-hidden" aria-busy="true" aria-label="Loading allocation report">
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="dl-skeleton h-8 w-8 rounded-[8px] shrink-0" />
                <div className="dl-skeleton h-4 flex-1 rounded-[var(--radius-sm)]" />
                <div className="dl-skeleton h-4 w-24 rounded-[var(--radius-sm)] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : report.length === 0 ? (
        <div className="surface px-5 py-12 text-center">
          <p className="text-[14px] font-medium text-[var(--text-1)]">No partners found.</p>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            Partners in an active or inactive program will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[#FAFAF8]">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap">
                      Partner
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap w-[140px]">
                      Program
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap w-[180px]"
                      title="Program limit = default capacity + approved extra. Remaining = limit − assigned."
                    >
                      Capacity
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap w-[140px]"
                      title="Weekly cap = weekly limit − used this period: still assignable this week."
                    >
                      This Week
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap w-[120px]">
                      Period
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap w-[84px]">
                      Last Batch
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] whitespace-nowrap w-[132px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((row) => (
                    <AllocationRow
                      key={row.partnerId}
                      row={row}
                      onExtra={() =>
                        setApproveDialog({
                          open: true,
                          partnerId: row.partnerId,
                          partnerName: row.partnerName,
                        })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards — same data */}
          <div className="space-y-2 md:hidden">
            {report.map((row) => (
              <AllocationCard
                key={row.partnerId}
                row={row}
                onExtra={() =>
                  setApproveDialog({
                    open: true,
                    partnerId: row.partnerId,
                    partnerName: row.partnerName,
                  })
                }
              />
            ))}
          </div>
        </>
      )}

      {/* Approve dialog — shared Dialog, same submit logic */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => {
          if (!open) closeApproveDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose onClose={closeApproveDialog} />
          <DialogHeader>
            <DialogTitle>Approve Extra Leads</DialogTitle>
            <DialogDescription>
              Add extra leads to {approveDialog.partnerName}&apos;s program limit.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 px-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1" htmlFor="extra-qty">
                Quantity
              </label>
              <input
                id="extra-qty"
                type="number"
                min="1"
                value={approveQuantity}
                onChange={(e) => setApproveQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1" htmlFor="extra-reason">
                Reason
              </label>
              <input
                id="extra-reason"
                type="text"
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
                placeholder="e.g. High performance bonus"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={closeApproveDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={approving || !approveQuantity || parseInt(approveQuantity, 10) <= 0}
            >
              {approving ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run-allocation confirm — Dry Run stays immediate, no dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose onClose={closeConfirm} />
          <DialogHeader>
            <DialogTitle>Run allocation now?</DialogTitle>
            <DialogDescription>
              This assigns leads to partners immediately and cannot be undone from this screen.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 px-6 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-[var(--text-3)]">Partners in program</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">{partnersInProgram}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-[var(--text-3)]">With room left</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">{withRoom}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-[var(--text-3)]">Weekly limit</dt>
              <dd className="font-medium tabular-nums text-[var(--text-1)]">
                {DEFAULT_WEEKLY_LEAD_LIMIT} / partner
              </dd>
            </div>
          </dl>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConfirmOpen(false);
                handleRun(false);
              }}
            >
              Run allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Desktop row — every value from the row object
// ============================================

function AllocationRow({
  row,
  onExtra,
}: {
  row: AllocationReportRow;
  onExtra: () => void;
}) {
  const fullPct =
    row.effectiveProgramLimit > 0
      ? (row.totalAssigned / row.effectiveProgramLimit) * 100
      : 0;
  const weekPct =
    row.weeklyLimit > 0 ? (row.weeklyUsed / row.weeklyLimit) * 100 : 0;

  return (
    <tr className="border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150 hover:bg-[var(--hover-bg)]">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={row.partnerName} size="sm" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-1)] truncate" title={row.partnerName}>
              {row.partnerName}
            </p>
            <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
              {row.companyId}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-1.5 min-w-0">
          {row.programExpired ? (
            <Badge variant="danger" className="w-fit text-[11px] whitespace-nowrap">Expired</Badge>
          ) : !row.allocationEnabled ? (
            <Badge variant="info" className="w-fit text-[11px] whitespace-nowrap">Disabled</Badge>
          ) : (
            <Badge variant="default" className="w-fit text-[11px] whitespace-nowrap tabular-nums">
              Day {row.programDay}/{PROGRAM_DURATION_DAYS}
            </Badge>
          )}
          <div className="w-full max-w-[110px]">
            <Meter value={(row.programDay / PROGRAM_DURATION_DAYS) * 100} tone="neutral" />
          </div>
          <span
            className="text-[11px] text-[var(--text-3)] tabular-nums whitespace-nowrap"
            title={row.programStartDate}
          >
            Started {formatShortMonthDay(row.programStartDate)}
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <p
          className="text-[13px] tabular-nums text-[var(--text-1)] whitespace-nowrap"
          title={`Program limit = default ${DEFAULT_PROGRAM_LEAD_LIMIT} + approved extra. Remaining = limit − assigned.`}
        >
          <span className="font-medium">{row.totalAssigned}</span>
          <span className="text-[var(--text-3)]"> / {row.effectiveProgramLimit}</span>
          {row.approvedExtraLeads > 0 && (
            <span className="ml-1 text-[11px] text-[var(--status-success)]">(+{row.approvedExtraLeads})</span>
          )}
        </p>
        <div className="mt-1.5">
          <Meter value={fullPct} tone={fullPct >= 90 ? "amber" : "accent"} />
        </div>
        <p className="mt-1 text-[11px] tabular-nums whitespace-nowrap text-[var(--text-3)]">
          {row.programCapacity > 0 ? `${row.programCapacity} remaining` : "Full"}
        </p>
      </td>
      <td className="px-4 py-2.5 text-right">
        <p
          className="text-[13px] tabular-nums text-[var(--text-1)] whitespace-nowrap"
          title="Weekly cap = weekly limit − used this period: still assignable this week."
        >
          <span className="font-medium">{row.weeklyUsed}</span>
          <span className="text-[var(--text-3)]"> / {row.weeklyLimit}</span>
        </p>
        <div className="mt-1.5">
          <Meter value={weekPct} tone="neutral" />
        </div>
        <p className="mt-1 text-[11px] tabular-nums whitespace-nowrap text-[var(--text-3)]">
          {row.weeklyCapacity} left
        </p>
      </td>
      <td
        className="px-4 py-2.5 text-[12px] tabular-nums text-[var(--text-2)] whitespace-nowrap"
        title={`${row.periodStart} to ${row.periodEnd}`}
      >
        {formatShortDateRange(row.periodStart, row.periodEnd)}
      </td>
      <td className="px-4 py-2.5 text-[12px] tabular-nums text-[var(--text-2)] whitespace-nowrap">
        {row.lastBatchAt
          ? new Date(row.lastBatchAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button
          variant="secondary"
          size="sm"
          className="text-[12px] whitespace-nowrap"
          onClick={onExtra}
          disabled={row.programExpired}
          title={
            row.programExpired
              ? "Extra leads cannot be approved after the 30-day program ends"
              : undefined
          }
        >
          + Extra leads
        </Button>
      </td>
    </tr>
  );
}

// ============================================
// Mobile card — same data, same action
// ============================================

function AllocationCard({
  row,
  onExtra,
}: {
  row: AllocationReportRow;
  onExtra: () => void;
}) {
  const fullPct =
    row.effectiveProgramLimit > 0
      ? (row.totalAssigned / row.effectiveProgramLimit) * 100
      : 0;
  const weekPct =
    row.weeklyLimit > 0 ? (row.weeklyUsed / row.weeklyLimit) * 100 : 0;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={row.partnerName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-[var(--text-1)] truncate" title={row.partnerName}>
            {row.partnerName}
          </p>
          <p className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
            {row.companyId}
          </p>
        </div>
        {row.programExpired ? (
          <Badge variant="danger" className="text-[11px] whitespace-nowrap shrink-0">Expired</Badge>
        ) : !row.allocationEnabled ? (
          <Badge variant="info" className="text-[11px] whitespace-nowrap shrink-0">Disabled</Badge>
        ) : (
          <Badge variant="default" className="text-[11px] whitespace-nowrap tabular-nums shrink-0">
            Day {row.programDay}/{PROGRAM_DURATION_DAYS}
          </Badge>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-[12px] text-[var(--text-2)] tabular-nums whitespace-nowrap">
            <span className="font-medium text-[var(--text-1)]">{row.totalAssigned}</span>
            <span className="text-[var(--text-3)]"> / {row.effectiveProgramLimit}</span>
            {row.approvedExtraLeads > 0 && (
              <span className="ml-1 text-[11px] text-[var(--status-success)]">(+{row.approvedExtraLeads})</span>
            )}
          </p>
          <p className="text-[11px] tabular-nums whitespace-nowrap text-[var(--text-3)]">
            {row.programCapacity > 0 ? `${row.programCapacity} remaining` : "Full"}
          </p>
        </div>
        <Meter value={fullPct} tone={fullPct >= 90 ? "amber" : "accent"} />
        <p
          className="mt-1.5 text-[11px] tabular-nums text-[var(--text-3)] whitespace-nowrap"
          title={row.programStartDate}
        >
          Started {formatShortMonthDay(row.programStartDate)}
        </p>
      </div>

      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-[12px] text-[var(--text-2)]">This week</p>
          <p className="text-[12px] tabular-nums text-[var(--text-1)] whitespace-nowrap">
            <span className="font-medium">{row.weeklyUsed}</span>
            <span className="text-[var(--text-3)]"> / {row.weeklyLimit}</span>
            <span className="ml-1.5 text-[var(--text-3)]">· {row.weeklyCapacity} left</span>
          </p>
        </div>
        <Meter value={weekPct} tone="neutral" />
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] tabular-nums text-[var(--text-3)]">
          <span className="whitespace-nowrap" title={`${row.periodStart} to ${row.periodEnd}`}>
            {formatShortDateRange(row.periodStart, row.periodEnd)}
          </span>
          <span className="whitespace-nowrap">
            Batch:{" "}
            {row.lastBatchAt
              ? new Date(row.lastBatchAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="mt-3 min-h-[44px] w-full text-[13px]"
        onClick={onExtra}
        disabled={row.programExpired}
        title={
          row.programExpired
            ? "Extra leads cannot be approved after the 30-day program ends"
            : undefined
        }
      >
        + Extra leads
      </Button>
    </div>
  );
}
