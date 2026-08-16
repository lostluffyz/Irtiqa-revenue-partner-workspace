"use client";

import { useState, useEffect, useCallback } from "react";
import { getAllocationReportAction, runAllocationAction, approveExtraLeadsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ============================================
// Types
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

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00Z");
    const e = new Date(end + "T00:00:00Z");
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-1)]">Lead Allocation</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Automatic 30-day program allocation • 100 leads/week • Daily scheduler at 06:00 UTC
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRun(true)}
            disabled={running || dryRunning}
          >
            {dryRunning ? "Running..." : "Dry Run"}
          </Button>
          <Button
            size="sm"
            onClick={() => handleRun(false)}
            disabled={running || dryRunning}
          >
            {running ? "Running..." : "Run Allocation"}
          </Button>
        </div>
      </div>

      {/* Result banner */}
      {lastResult && (
        <div className={`rounded-lg border p-4 ${lastResult.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          <p className="font-medium text-sm">
            {lastResult.dryRun ? "Dry Run" : "Allocation"} Complete
          </p>
          <p className="text-sm text-[var(--text-2)] mt-1">
            {lastResult.partners} partners • {lastResult.assigned} leads assigned
            {lastResult.errors.length > 0 && ` • ${lastResult.errors.length} errors`}
          </p>
          {lastResult.errors.length > 0 && (
            <ul className="mt-2 text-xs text-amber-700 list-disc list-inside">
              {lastResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Report table */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">Loading allocation report...</div>
      ) : report.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">No partners found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">Partner</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">Program</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">Assigned</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">Program Limit</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">Program Cap</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">Weekly Used</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">Weekly Cap</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">Period</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-2)]">Last Batch</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-2)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row) => (
                <tr
                  key={row.partnerId}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--hover-bg)]"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-[var(--text-1)]">{row.partnerName}</p>
                      <p className="text-xs text-[var(--text-3)]">{row.companyId}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {row.programExpired ? (
                        <Badge variant="danger" className="w-fit text-xs">Expired</Badge>
                      ) : !row.allocationEnabled ? (
                        <Badge variant="info" className="w-fit text-xs">Disabled</Badge>
                      ) : (
                        <Badge variant="default" className="w-fit text-xs">Day {row.programDay}/30</Badge>
                      )}
                      <span className="text-xs text-[var(--text-3)]">
                        Start: {new Date(row.programStartDate + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{row.totalAssigned}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {row.effectiveProgramLimit}
                    {row.approvedExtraLeads > 0 && (
                      <span className="text-emerald-600 text-xs ml-1">(+{row.approvedExtraLeads})</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={row.programCapacity <= 0 ? "text-red-600" : row.programCapacity < 50 ? "text-amber-600" : ""}>
                      {row.programCapacity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{row.weeklyUsed}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={row.weeklyCapacity <= 0 ? "text-red-600" : row.weeklyCapacity < 20 ? "text-amber-600" : ""}>
                      {row.weeklyCapacity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-3)]">
                    {formatPeriod(row.periodStart, row.periodEnd)}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-3)]">
                    {row.lastBatchAt
                      ? new Date(row.lastBatchAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setApproveDialog({
                          open: true,
                          partnerId: row.partnerId,
                          partnerName: row.partnerName,
                        })
                      }
                      disabled={row.programExpired}
                    >
                      + Extra Leads
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Dialog */}
      {approveDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setApproveDialog({ open: false, partnerId: "", partnerName: "" })} />
          <div className="relative bg-[var(--surface)] rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">Approve Extra Leads</h3>
            <p className="text-sm text-[var(--text-3)] mt-1">
              Add extra leads to {approveDialog.partnerName}&apos;s program limit.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={approveQuantity}
                  onChange={(e) => setApproveQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Reason</label>
                <input
                  type="text"
                  value={approveReason}
                  onChange={(e) => setApproveReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)]"
                  placeholder="e.g. High performance bonus"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setApproveDialog({ open: false, partnerId: "", partnerName: "" })}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approving || !approveQuantity || parseInt(approveQuantity, 10) <= 0}
              >
                {approving ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
