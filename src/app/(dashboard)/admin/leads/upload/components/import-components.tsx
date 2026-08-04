// ============================================
// CSV Import — narrative UX
// ============================================
//
// Three acts:
//   1. STATUS — what was detected (one glance)
//   2. REVIEW — the actual data (preview + context)
//   3. CONFIRM — ready to import (footer)
//
// No card containers. No badge soup.
// Typography and whitespace are the design.

"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  CheckCircle, AlertTriangle, XCircle,
  ChevronRight,
  Loader2, Upload, Users,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportAnalysis } from "@/lib/csv/import-engine";
import type { DuplicateResult } from "../../actions";

// =========================================================================
// Types
// =========================================================================

export type ImportResultData = {
  success?: boolean;
  error?: string;
  inserted?: number;
  errors?: string[];
  fieldCounts?: Record<string, number>;
  elapsedMs?: number;
};

// =========================================================================
// Hooks
// =========================================================================

export function useAnimatedCounter(end: number, duration = 600): number {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(0);

  useEffect(() => {
    if (end === prevEnd.current) return;
    prevEnd.current = end;
    if (end === 0) { setCount(0); return; }

    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      setCount(Math.round(eased * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return count;
}

// =========================================================================
// Constants
// =========================================================================

export const IMPORT_FIELD_ORDER = [
  "company_name", "website", "phone", "email", "industry", "country", "internal_notes",
] as const;

export const FIELD_LABELS: Record<string, string> = {
  company_name: "Company", website: "Website", phone: "Phone", email: "Email",
  industry: "Industry", country: "Country", internal_notes: "Notes",
  city: "City", state: "State", postal_code: "Postal Code", address: "Address",
};

// =========================================================================
// Stub exports (for any lingering page imports)
// =========================================================================

export const FIELD_ICONS: Record<string, ReactNode> = {};
export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
export function SectionHeader({ title }: { icon?: ReactNode; title: string; subtitle?: string; children?: ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-[var(--text-1)]">{title}</h3>;
}

// =========================================================================
// Act 1 — Import Status (single glance, anchored)
// =========================================================================

export function ImportStatus({
  analysis, duplicates, duplicateLoading,
}: {
  analysis: ImportAnalysis; duplicates: DuplicateResult | null; duplicateLoading: boolean;
}) {
  const totalDupes = duplicates ? duplicates.duplicateCount + duplicates.possibleCount : null;
  const provider = analysis.provider.name !== "Unknown" ? analysis.provider.name : null;

  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        {/* Provider badge */}
        {provider && (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
            </span>
            <span className="text-[var(--text-2)] font-medium">{provider}</span>
          </span>
        )}

        <span className="h-3 w-px bg-[var(--border)]" />

        {/* Row count — the most important number */}
        <span className="tabular-nums">
          <span className="text-[18px] font-semibold text-[var(--text-1)]" style={{ fontFamily: "var(--font-mono)" }}>{analysis.totalRows.toLocaleString()}</span>
          <span className="text-[var(--text-3)] ml-1">rows</span>
        </span>

        {/* Confidence — colored by health */}
        <span className="tabular-nums">
          <span className={`text-[18px] font-semibold ${
            analysis.estimatedSuccess >= 90 ? "text-emerald-600" :
            analysis.estimatedSuccess >= 50 ? "text-amber-600" : "text-red-500"
          }`} style={{ fontFamily: "var(--font-mono)" }}>{analysis.estimatedSuccess}%</span>
          <span className="text-[var(--text-3)] ml-1">ready</span>
        </span>

        {/* Readiness */}
        {analysis.canProceed && (
          <span className="inline-flex items-center gap-1 text-[var(--status-success)] font-medium">
            <CheckCircle className="h-3.5 w-3.5" />
            Ready
          </span>
        )}

        {/* Duplicates */}
        {totalDupes !== null && (
          <span className={`inline-flex items-center gap-1.5 ${totalDupes > 0 ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}`}>
            {totalDupes > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
            <span className="font-semibold tabular-nums">{totalDupes}</span>
            <span className="text-[var(--text-3)]">{totalDupes === 1 ? "possible duplicate" : "possible duplicates"}</span>
          </span>
        )}
        {duplicateLoading && (
          <span className="text-[var(--text-3)] inline-flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking duplicates...
          </span>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Act 2 — Import Preview (clean table, centerpiece)
// =========================================================================

export function ImportPreviewTable({
  analysis, getPreviewValue,
}: {
  analysis: ImportAnalysis; getPreviewValue: (sourceHeader: string) => string | null;
}) {
  if (!analysis.previewRows?.length) return null;

  const resolvedFields = IMPORT_FIELD_ORDER.filter((field) => {
    const resolved = analysis.mappingAnalysis.fieldResolutions.find(
      (f) => f.canonicalField === field && f.resolved,
    );
    return resolved && resolved.candidates.length > 0;
  });

  if (resolvedFields.length === 0) return null;

  return (
    <div>
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="pb-3 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] w-[130px]">Field</th>
            <th className="pb-3 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] w-[160px]">Source</th>
            <th className="pb-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)]">Value</th>
            <th className="pb-3 pl-4 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] w-[48px]">OK</th>
          </tr>
        </thead>
        <tbody>
          {resolvedFields.map((field) => {
            const resolved = analysis.mappingAnalysis.fieldResolutions.find(
              (f) => f.canonicalField === field && f.resolved,
            )!;
            const mapping = resolved.candidates[0];
            const previewValue = getPreviewValue(mapping.sourceHeader);
            const ready = !!previewValue;

            return (
              <tr
                key={field}
                className="border-b border-[var(--border-subtle)] table-row-hover"
              >
                <td className="py-3 pr-4">
                  <span className="text-[13px] font-medium text-[var(--text-1)]">{FIELD_LABELS[field] || field}</span>
                </td>
                <td className="py-3 pr-4">
                  <code className="text-[12px] text-[var(--text-3)] truncate block max-w-[160px]" style={{ fontFamily: "var(--font-mono)" }}>{mapping.sourceHeader}</code>
                </td>
                <td className="py-3">
                  <span className={`text-[13px] block truncate max-w-[260px] ${ready ? "text-[var(--text-2)]" : "text-[var(--text-3)] italic"}`} style={{ fontFamily: "var(--font-mono)" }}>
                    {ready ? previewValue : "empty"}
                  </span>
                </td>
                <td className="py-3 pl-4 text-right">
                  {ready ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    </span>
                  ) : (
                    <span className="text-[var(--text-3)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =========================================================================
// Data Quality — compact sidebar bars
// =========================================================================

export function DataQualitySection({ fieldQuality }: { fieldQuality: ImportAnalysis["fieldQuality"] }) {
  if (!fieldQuality.length) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">Data quality</h4>
      {fieldQuality.map((fq) => {
        const pct = fq.percentage;
        const barColor = pct >= 90 ? "bg-emerald-400" : pct >= 70 ? "bg-blue-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
        return (
          <div key={fq.canonicalField} className="space-y-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-2)]">{fq.label}</span>
              <span className={`font-semibold tabular-nums ${
                pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-blue-600" : pct >= 50 ? "text-amber-600" : "text-red-500"
              }`} style={{ fontFamily: "var(--font-mono)" }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--canvas)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
// Duplicates — PR-style inline cards (no wrapping container)
// =========================================================================

export function DuplicateSection({
  duplicates, loading,
}: {
  duplicates: DuplicateResult | null; loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">Possible duplicates</h4>
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking...
        </div>
      </div>
    );
  }

  if (!duplicates) return null;
  const hasIssues = duplicates.duplicateCount > 0 || duplicates.possibleCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">Possible duplicates</h4>
        {hasIssues && (
          <span className="text-[12px] text-[var(--status-warning)] font-semibold tabular-nums">
            {duplicates.duplicateCount + duplicates.possibleCount} found
          </span>
        )}
      </div>

      {duplicates.duplicates.slice(0, 10).map((d, i) => {
        const hasWebsite = !!d.website;
        const hasPhone = !!d.phone;
        const matchReasons: string[] = [];
        if (hasWebsite) matchReasons.push("Website");
        if (hasPhone) matchReasons.push("Phone");
        if (!hasWebsite && !hasPhone) matchReasons.push("Company Name");

        return (
          <div
            key={i}
            className="border-l-2 border-l-amber-400 pl-3 space-y-1.5 overflow-hidden"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="text-[13px] font-medium text-[var(--text-1)] truncate">{d.companyName}</span>
            </div>
            <p className="text-[12px] text-[var(--text-3)] ml-[18px]">
              Matched by <span className="font-medium text-[var(--text-2)]">{matchReasons.join(" + ")}</span>
            </p>
            {(hasWebsite || hasPhone) && (
              <div className="ml-[18px] flex flex-col gap-0.5">
                {hasWebsite && (
                  <span className="inline-flex items-start gap-1 text-[12px] text-[var(--text-2)] min-w-0">
                    <CheckCircle className="h-2.5 w-2.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="break-all" style={{ fontFamily: "var(--font-mono)" }}>{d.website}</span>
                  </span>
                )}
                {hasPhone && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-2)]">
                    <CheckCircle className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                    <span style={{ fontFamily: "var(--font-mono)" }}>{d.phone}</span>
                  </span>
                )}
              </div>
            )}
            <span className="ml-[18px] inline-flex items-center gap-0.5 text-[12px] text-[var(--accent)] cursor-default">
              <ExternalLink className="h-2.5 w-2.5" />
              View existing
            </span>
          </div>
        );
      })}

      {duplicates.duplicates.length === 0 && (
        <div className="flex items-center gap-2 text-[13px] text-[var(--status-success)]">
          <CheckCircle className="h-4 w-4" />
          No duplicates found
        </div>
      )}

      {duplicates.duplicates.length > 10 && (
        <p className="text-[12px] text-[var(--text-3)]">+{duplicates.duplicates.length - 10} more</p>
      )}
    </div>
  );
}

// =========================================================================
// Column mapping — collapsible details
// =========================================================================

export function ColumnMappingTable({ analysis }: { analysis: ImportAnalysis }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
        <ChevronRight className="h-3 w-3 transition-transform duration-200 group-open:rotate-90" />
        Column mapping
        <span className="tabular-nums font-normal normal-case text-[var(--text-3)]">({analysis.mappingAnalysis.columnMappings.length})</span>
      </summary>
      <div className="mt-2 space-y-0.5">
        {analysis.mappingAnalysis.columnMappings.map((m, i) => {
          const isMapped = m.canonicalField != null;
          return (
            <div key={i} className="flex items-center justify-between py-1 text-[12px]">
              <div className="min-w-0 flex-1 flex items-center gap-1">
                <code className="text-[var(--text-2)] truncate" style={{ fontFamily: "var(--font-mono)" }}>{m.sourceHeader}</code>
                {isMapped && (
                  <span className="text-[var(--text-3)]">→ <span className="text-[var(--text-2)]">{m.canonicalField}</span></span>
                )}
              </div>
              {isMapped ? (
                <CheckCircle className="h-2.5 w-2.5 text-emerald-400 shrink-0 ml-2" />
              ) : (
                <span className="text-[var(--text-3)] italic shrink-0 ml-2">skip</span>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// =========================================================================
// Ignored columns — collapsed
// =========================================================================

export function IgnoredColumnsSection({ headers }: { headers: string[] }) {
  if (!headers.length) return null;
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
        <ChevronRight className="h-3 w-3 transition-transform duration-200 group-open:rotate-90" />
        Ignored columns
        <span className="tabular-nums font-normal normal-case text-[var(--text-3)]">({headers.length})</span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {headers.map((h, i) => (
          <code key={i} className="text-[12px] text-[var(--text-3)] bg-[var(--canvas)] px-1.5 py-0.5 rounded-[4px] max-w-full truncate inline-block align-bottom" style={{ fontFamily: "var(--font-mono)" }} title={h}>{h}</code>
        ))}
      </div>
    </details>
  );
}

// =========================================================================
// Import progress screen
// =========================================================================

export type ImportStage = "uploading" | "validating" | "matching" | "dedup" | "importing" | "finalizing";

export function ImportStepper({ currentStage }: { currentStage: ImportStage }) {
  const stages = ["Analyze", "Map", "Import", "Finalize"];
  const stageKeys = ["uploading", "matching", "importing", "finalizing"];
  const currentIdx = stageKeys.indexOf(currentStage === "validating" ? "uploading" : currentStage === "dedup" ? "matching" : currentStage);

  return (
    <div className="py-16 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)] mx-auto mb-4" />
      <p className="text-[13px] text-[var(--text-2)] mb-8">Importing your leads...</p>
      <div className="flex items-center justify-center gap-0 max-w-xs mx-auto">
        {stages.map((label, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={label} className="flex items-center flex-1">
              <span className={`flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold transition-all ${
                done ? "bg-emerald-100 text-emerald-600" :
                active ? "bg-[var(--text-1)] text-white" :
                "bg-[var(--canvas)] text-[var(--text-3)]"
              }`}>
                {done ? <CheckCircle className="h-3 w-3" /> : idx + 1}
              </span>
              {idx < stages.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${done ? "bg-emerald-200" : "bg-[var(--border)]"}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-[var(--text-3)] mt-3">{stages[currentIdx] || "Import"}...</p>
    </div>
  );
}

// =========================================================================
// Success — celebration, not stats
// =========================================================================

export function SuccessScreen({
  result, onViewLeads, onUploadAnother,
}: {
  result: ImportResultData; onViewLeads: () => void; onUploadAnother: () => void;
}) {
  const inserted = result.inserted || 0;
  const skipped = result.errors?.length || 0;
  const elapsedSec = result.elapsedMs != null ? (result.elapsedMs / 1000).toFixed(1) : null;

  return (
    <div className="py-20 max-w-md mx-auto text-center">
      {/* Animated check */}
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-6">
        <CheckCircle className="h-8 w-8 text-emerald-500" />
      </span>

      <h2 className="text-[28px] font-bold text-[var(--text-1)] tracking-[-0.02em]">Import complete</h2>
      <p className="text-[13px] text-[var(--text-3)] mt-1.5">
        {inserted} lead{inserted !== 1 ? "s" : ""} imported{elapsedSec ? ` in ${elapsedSec}s` : ""}
      </p>

      <div className="flex items-center justify-center gap-10 mt-8">
        <div className="text-center">
          <p className="text-[32px] font-bold text-emerald-600 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{inserted}</p>
          <p className="text-[12px] text-[var(--text-3)] mt-1">Imported</p>
        </div>
        {skipped > 0 && (
          <div className="text-center">
            <p className="text-[32px] font-bold text-amber-600 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{skipped}</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">Skipped</p>
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-center gap-3">
        <Button type="button" onClick={onViewLeads} className="gap-1.5">
          <Users className="h-4 w-4" />
          View Leads
        </Button>
        <Button type="button" variant="secondary" onClick={onUploadAnother} className="gap-1.5">
          <Upload className="h-4 w-4" />
          Upload Another
        </Button>
      </div>
    </div>
  );
}

// =========================================================================
// Error
// =========================================================================

export function ErrorScreen({ result, onRetry }: { result: ImportResultData; onRetry: () => void }) {
  return (
    <div className="py-20 max-w-md mx-auto text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-6">
        <XCircle className="h-8 w-8 text-red-500" />
      </span>
      <h2 className="text-[28px] font-bold text-[var(--text-1)] tracking-[-0.02em]">Import failed</h2>
      <p className="text-[13px] text-red-600 mt-1.5">{result.error}</p>
      <div className="mt-8">
        <Button type="button" variant="secondary" onClick={onRetry} className="gap-1.5">
          <Upload className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

// =========================================================================
// Issue alerts (inline, no containers)
// =========================================================================

export function MissingRequiredAlert({ missingRequired }: { missingRequired: string[] }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div>
        <p className="font-medium text-red-600">Missing required column</p>
        <p className="text-red-500 text-[12px] mt-0.5">
          <strong style={{ fontFamily: "var(--font-mono)" }}>{missingRequired.join(", ")}</strong> must be mapped to import.
        </p>
      </div>
    </div>
  );
}

export function AmbiguityAlert() {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div>
        <p className="font-medium text-amber-600">Ambiguous columns</p>
        <p className="text-amber-500 text-[12px] mt-0.5">Multiple CSV headers map to the same field. Choose which to use below.</p>
      </div>
    </div>
  );
}

// =========================================================================
// Ambiguity resolver
// =========================================================================

export function AmbiguityResolver({
  field, currentChoice, onChoose,
}: {
  field: { canonicalField: string; label: string; candidates: { sourceHeader: string; matchTier: string }[] };
  currentChoice: string; onChoose: (canonicalField: string, sourceHeader: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`amb-${field.canonicalField}`} className="text-[12px] text-[var(--text-2)]">
        {field.label} <code className="text-[var(--text-3)]" style={{ fontFamily: "var(--font-mono)" }}>({field.canonicalField})</code>
      </label>
      <select
        id={`amb-${field.canonicalField}`}
        className="input-field text-[13px]"
        value={currentChoice}
        onChange={(e) => onChoose(field.canonicalField, e.target.value)}
        aria-label={`Choose source for ${field.label}`}
      >
        {field.candidates.map((c, i) => (
          <option key={i} value={c.sourceHeader}>
            {c.sourceHeader} — {c.matchTier === "exact_alias" ? `alias → ${field.canonicalField}` : "canonical"}
          </option>
        ))}
      </select>
    </div>
  );
}

// =========================================================================
// Layout
// =========================================================================

export function TwoColumnLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-12">
      <div className="min-w-0">{left}</div>
      <div className="min-w-0 space-y-8">{right}</div>
    </div>
  );
}

// =========================================================================
// Act 3 — Confirmation footer
// =========================================================================

export function StickyFooter({
  rowCount, duplicates, disabled, loading, onCancel,
}: {
  rowCount: number; duplicates: DuplicateResult | null; disabled: boolean; loading: boolean; onCancel: () => void;
}) {
  const estimatedSec = Math.max(1, Math.round(rowCount / 250));
  const totalDupes = duplicates ? duplicates.duplicateCount + duplicates.possibleCount : 0;

  return (
    <div className="sticky bottom-0 z-20 -mx-6 px-6 mt-10">
      {/* Gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)]/95 to-transparent pointer-events-none h-24 -top-24" />

      <div className="relative bg-[var(--surface)] border-t border-[var(--border)] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: summary */}
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-1)]">Ready to import</p>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              <span className="tabular-nums">{rowCount.toLocaleString()} companies</span>
              {totalDupes > 0 && (
                <><span className="mx-1.5">·</span><span className="tabular-nums">{totalDupes} possible duplicate{totalDupes !== 1 ? "s" : ""}</span></>
              )}
              <span className="mx-1.5">·</span>
              <span>~{estimatedSec}s</span>
            </p>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading} className="text-[13px] text-[var(--text-3)]">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={disabled || loading}
              className="gap-2 text-[13px] font-semibold min-w-[140px]"
              aria-label={`Import ${rowCount} leads`}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <>Import {rowCount.toLocaleString()}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
