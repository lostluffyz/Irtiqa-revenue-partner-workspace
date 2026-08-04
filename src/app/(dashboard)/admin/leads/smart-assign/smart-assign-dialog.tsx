"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { MultiPartnerSelect } from "@/components/ui/multi-partner-select";
import { DistributionPreview } from "@/components/ui/distribution-preview";
import { BatchProgress } from "@/components/ui/batch-progress";
import {
  ASSIGNMENT_METHODS,
  getMethodConfig,
  type FieldConfig,
} from "./assignment-methods";
import type { ActivePartner } from "../lead-filters";
import {
  previewSmartAssignmentAction,
  executeSmartAssignmentAction,
  getDistinctFieldAction,
  type SmartAssignmentParams,
} from "../actions";
import type { AssignmentPreview } from "@/lib/lead-assignment";
import {
  Check,
  ArrowLeft,
  Sparkles,
  SearchX,
  Info,
  Clock,
  Download,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type Step = "configure" | "preview" | "confirm" | "result";

interface SmartAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePartners: ActivePartner[];
  onComplete: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatFilterLabel(key: string, value: string): string {
  const labels: Record<string, string> = {
    country: "Country",
    state: "State",
    city: "City",
    industry: "Industry",
    status: "Status",
    domain: "Domain",
    timeRange: "Time Range",
  };
  return `${labels[key] || key}: ${value}`;
}

function formatTimestamp(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function downloadReportCSV(
  distribution: { partnerName: string; assigned: number; skipped: number }[],
  method: string,
  completedAt: string,
) {
  const rows = [
    ["Partner", "Assigned", "Skipped", "Method", "Completed At"],
    ...distribution.map((d) => [
      d.partnerName,
      String(d.assigned),
      String(d.skipped),
      method,
      completedAt,
    ]),
  ];
  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `assignment-report-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════
   SearchableField — Fetches distinct values, renders as Popover
   ═══════════════════════════════════════════════════════════════ */

function SearchableField({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (val: string) => void;
}) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    if (!field.fetchFrom) return;
    fetchedRef.current = true;

    setLoading(true);
    const fd = new FormData();
    fd.set("field", field.fetchFrom);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getDistinctFieldAction(null, fd).then((res: any) => {
      if (res?.success && res.values) {
        setOptions(res.values.map((v: string) => ({ value: v, label: v })));
      }
      setLoading(false);
    });
  }, [field.fetchFrom]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ||
    value ||
    field.placeholder ||
    "Select...";

  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">
        {field.label}
        {field.required && (
          <span className="text-[var(--status-danger)] ml-0.5">*</span>
        )}
      </label>
      <Popover
        trigger={
          <PopoverTrigger
            label={loading ? "Loading..." : selectedLabel}
            active={!!value}
            className="w-full justify-between"
          />
        }
        options={options}
        value={value}
        onChange={onChange}
        searchable
        placeholder={field.placeholder || "Search..."}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   StepIndicator — Compact progress bar
   ═══════════════════════════════════════════════════════════════ */

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "configure", label: "Configure" },
    { key: "preview", label: "Preview" },
    { key: "confirm", label: "Confirm" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center gap-1.5 mb-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors duration-150 ${
              i <= currentIdx
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--canvas)] text-[var(--text-3)] border border-[var(--border)]"
            }`}
          >
            {i < currentIdx ? <Check className="h-2.5 w-2.5" /> : i + 1}
          </div>
          <span
            className={`text-[11px] font-medium transition-colors duration-150 ${
              i <= currentIdx ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`w-6 h-px mx-0.5 transition-colors duration-150 ${
                i < currentIdx ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SummaryCard — Compact Partner / Method / Filter card
   ═══════════════════════════════════════════════════════════════ */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="dl-surface rounded-[var(--radius-sm)] px-3 py-2 transition-shadow duration-150 hover:shadow-[var(--shadow-2)]">
      <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[13px] font-medium text-[var(--text-1)] truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SmartAssignDialog — Main component
   ═══════════════════════════════════════════════════════════════ */

export function SmartAssignDialog({
  open,
  onOpenChange,
  activePartners,
  onComplete,
}: SmartAssignDialogProps) {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("configure");
  const [partnerIds, setPartnerIds] = useState<string[]>([]);
  const [method, setMethod] = useState("random");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState("50");
  const [previewData, setPreviewData] = useState<AssignmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [executeResult, setExecuteResult] = useState<{
    assigned: number;
    skipped: number;
    distribution: { partnerId: string; partnerName: string; assigned: number; skipped: number }[];
    method: string;
    completedAt: string;
    duration: number;
  } | null>(null);

  // ── Reset on close ─────────────────────────────────────────
  const resetDialog = useCallback(() => {
    setStep("configure");
    setPartnerIds([]);
    setMethod("random");
    setFormData({});
    setLimit("50");
    setPreviewData(null);
    setPreviewLoading(false);
    setExecuteLoading(false);
    setBatchProgress(null);
    setExecuteResult(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetDialog, 200);
  }, [onOpenChange, resetDialog]);

  const handleAssignMore = useCallback(() => {
    setStep("configure");
    setPreviewData(null);
    setExecuteResult(null);
    setBatchProgress(null);
    setPreviewLoading(false);
    setExecuteLoading(false);
  }, []);

  // ── Debounced preview ──────────────────────────────────────
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPreview = useCallback(
    (
      pIds: string[],
      methodVal: string,
      formDataVal: Record<string, string>,
      limitVal: string,
    ) => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

      previewTimerRef.current = setTimeout(() => {
        const limitNum = parseInt(limitVal, 10);
        if (!pIds.length || !methodVal || isNaN(limitNum) || limitNum <= 0)
          return;

        setPreviewLoading(true);
        const fd = new FormData();
        const params: SmartAssignmentParams = {
          partnerIds: pIds,
          method: methodVal,
          limit: limitNum,
          ...formDataVal,
        };
        fd.set("params", JSON.stringify(params));

        previewSmartAssignmentAction(null, fd).then((res) => {
          if (res.success && res.preview) {
            setPreviewData(res.preview);
            setPreviewLoading(false);
            setStep("preview");
          } else if (res.error) {
            setPreviewLoading(false);
            toast({
              title: "Preview failed",
              description: res.error,
              variant: "error",
            });
          }
        });
      }, 300);
    },
    [toast],
  );

  // ── Cleanup timers ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // ── Batch progress animation ───────────────────────────────
  const executeStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!executeLoading) {
      setBatchProgress(null);
      return;
    }

    const limitNum = parseInt(limit, 10) || 50;
    executeStartTimeRef.current = Date.now();

    // Estimate duration: ~500ms per 100 leads, min 1s
    const estimatedMs = Math.max(1000, Math.ceil(limitNum / 100) * 500);

    const interval = setInterval(() => {
      const elapsed = Date.now() - executeStartTimeRef.current;
      const pct = Math.min(95, (elapsed / estimatedMs) * 100);
      setBatchProgress({
        current: Math.floor((pct / 100) * limitNum),
        total: limitNum,
      });
    }, 200);

    return () => clearInterval(interval);
  }, [executeLoading, limit]);

  // ── Helpers ────────────────────────────────────────────────
  const methodConfig = getMethodConfig(method);
  const limitNum = parseInt(limit, 10) || 0;

  const selectedPartnerLabels = partnerIds
    .map((id) => {
      const p = activePartners.find((ap) => ap.id === id);
      return p?.profiles?.full_name || p?.company_id || id;
    })
    .join(", ");

  const canProceedToPreview =
    partnerIds.length > 0 &&
    !!method &&
    limitNum > 0 &&
    limitNum <= 10000 &&
    (!methodConfig?.minPartners ||
      partnerIds.length >= methodConfig.minPartners);

  const requiredFieldsFilled = methodConfig
    ? methodConfig.fields
        .filter((f) => f.required)
        .every((f) => {
          if (f.type === "number") return limitNum > 0;
          return !!formData[f.key];
        })
    : true;

  const appliedFilters = Object.entries(formData).filter(
    ([, v]) => v && v.trim(),
  );

  const remaining = previewData
    ? Math.max(0, previewData.matching - previewData.willAssign)
    : 0;

  const needsMinPartners =
    methodConfig?.minPartners &&
    partnerIds.length > 0 &&
    partnerIds.length < methodConfig.minPartners;

  // ── Handle next (configure → preview) ──────────────────────
  const handleNext = () => {
    if (!canProceedToPreview || !requiredFieldsFilled) return;
    triggerPreview(partnerIds, method, formData, limit);
  };

  // ── Handle confirm (preview → execute) ─────────────────────
  const handleConfirm = useCallback(async () => {
    setExecuteLoading(true);
    const fd = new FormData();
    const params: SmartAssignmentParams = {
      partnerIds,
      method,
      limit: limitNum,
      ...formData,
    };
    fd.set("params", JSON.stringify(params));

    const res = await executeSmartAssignmentAction(null, fd);

    if (res.success && res.assigned !== undefined) {
      setExecuteResult({
        assigned: res.assigned,
        skipped: res.skipped || 0,
        distribution: res.distribution || [],
        method: res.method || method,
        completedAt: formatTimestamp(),
        duration: res.duration || 0,
      });
      setExecuteLoading(false);
      setStep("result");

      const partnerCount = res.distribution?.length || 1;
      toast({
        title: "Leads assigned",
        description: `Assigned: ${res.assigned} · Across ${partnerCount} partner${partnerCount !== 1 ? "s" : ""}`,
        variant: "success",
      });

      onComplete();
    } else if (res.error) {
      setExecuteLoading(false);
      toast({
        title: "Assignment failed",
        description: res.error,
        variant: "error",
      });
    }
  }, [partnerIds, method, limitNum, formData, toast, onComplete]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="dialog-content-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              Smart Lead Assignment
            </span>
          </DialogTitle>
          <DialogDescription>
            Assign leads to partners using smart filters and preview
          </DialogDescription>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        {/* Scrollable body */}
        <div className="dialog-body px-6 py-4">
          {/* Step indicator */}
          {step !== "result" && <StepIndicator step={step} />}

          {/* ═══════════════════════════════════════════════════════════
              STEP 1 — Configure
              ═══════════════════════════════════════════════════════════ */}
          {step === "configure" && (
            <div
              className="space-y-4"
              style={{ animation: "fadeIn 150ms ease-out" }}
            >
              {/* Partners + Limit — inline row */}
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">
                    Partners{" "}
                    <span className="text-[var(--status-danger)]">*</span>
                  </label>
                  <MultiPartnerSelect
                    partners={activePartners.map((p) => ({
                      id: p.id,
                      label: p.profiles?.full_name || "Unknown",
                      sublabel: p.company_id,
                    }))}
                    selected={partnerIds}
                    onChange={(ids) => {
                      setPartnerIds(ids);
                      triggerPreview(ids, method, formData, limit);
                    }}
                    placeholder="Select partners..."
                  />
                  {needsMinPartners && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      Auto Balance requires at least{" "}
                      {methodConfig?.minPartners} partners
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">
                    Count{" "}
                    <span className="text-[var(--status-danger)]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={limit}
                    onChange={(e) => {
                      setLimit(e.target.value);
                      triggerPreview(
                        partnerIds,
                        method,
                        formData,
                        e.target.value,
                      );
                    }}
                    className="input-field w-full text-[13px] h-[32px]"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Method grid — 2 columns */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1.5">
                  Assignment Method{" "}
                  <span className="text-[var(--status-danger)]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ASSIGNMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = method === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => {
                          setMethod(m.value);
                          setFormData({});
                          triggerPreview(partnerIds, m.value, {}, limit);
                        }}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-left transition-all duration-150 border
                          ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent-light)] ring-1 ring-[var(--accent)]/20"
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-[#D1D5DB] hover:bg-[var(--hover-bg)] hover:shadow-[var(--shadow-1)]"
                          }
                        `}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isSelected
                              ? "text-[var(--accent)]"
                              : "text-[var(--text-3)]"
                          }`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-[12px] font-medium leading-tight ${
                              isSelected
                                ? "text-[var(--accent)]"
                                : "text-[var(--text-1)]"
                            }`}
                          >
                            {m.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected method description */}
                {methodConfig && (
                  <p className="mt-2 text-[11px] text-[var(--text-3)] leading-relaxed">
                    {methodConfig.description}
                  </p>
                )}
              </div>

              {/* Dynamic fields from registry */}
              {methodConfig && methodConfig.fields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {methodConfig.fields.map((field) => (
                    <div key={field.key}>
                      {field.type === "select" && field.options && (
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">
                            {field.label}
                            {field.required && (
                              <span className="text-[var(--status-danger)] ml-0.5">
                                *
                              </span>
                            )}
                          </label>
                          <select
                            value={formData[field.key] || ""}
                            onChange={(e) => {
                              const next = {
                                ...formData,
                                [field.key]: e.target.value,
                              };
                              setFormData(next);
                              triggerPreview(
                                partnerIds,
                                method,
                                next,
                                limit,
                              );
                            }}
                            className="input-field w-full text-[13px] h-[32px]"
                          >
                            <option value="">
                              Select {field.label.toLowerCase()}...
                            </option>
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {field.type === "searchable" && (
                        <SearchableField
                          field={field}
                          value={formData[field.key] || ""}
                          onChange={(val) => {
                            const next = {
                              ...formData,
                              [field.key]: val,
                            };
                            setFormData(next);
                            triggerPreview(
                              partnerIds,
                              method,
                              next,
                              limit,
                            );
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 2 — Preview
              ═══════════════════════════════════════════════════════════ */}
          {step === "preview" && (
            <div
              className="space-y-3"
              style={{ animation: "fadeIn 150ms ease-out" }}
            >
              {/* Skeleton loading */}
              {previewLoading && !previewData && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="dl-surface p-3 rounded-[var(--radius-sm)] animate-pulse"
                      >
                        <div className="h-5 w-12 bg-[var(--canvas)] rounded mb-1" />
                        <div className="h-2.5 w-16 bg-[var(--canvas)] rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="dl-surface p-3 rounded-[var(--radius-sm)] animate-pulse">
                    <div className="h-4 w-48 bg-[var(--canvas)] rounded mb-2" />
                    <div className="space-y-1.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-3 bg-[var(--canvas)] rounded" />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview data */}
              {previewData && (
                <>
                  {/* Stats — 4 columns: Requested / Eligible / Will Assign / Remaining */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="dl-surface p-3 rounded-[var(--radius-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-2)]">
                      <p className="text-[18px] font-semibold dl-tabular">
                        {previewData.requested.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5 uppercase tracking-wide">
                        Requested
                      </p>
                    </div>
                    <div className="dl-surface p-3 rounded-[var(--radius-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-2)]">
                      <p className="text-[18px] font-semibold dl-tabular">
                        {previewData.matching.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5 uppercase tracking-wide">
                        Eligible
                      </p>
                    </div>
                    <div className="dl-surface p-3 rounded-[var(--radius-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-2)]">
                      <p className="text-[18px] font-semibold dl-tabular text-[var(--status-success)]">
                        {previewData.willAssign.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5 uppercase tracking-wide">
                        Will Assign
                      </p>
                    </div>
                    <div className="dl-surface p-3 rounded-[var(--radius-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-2)]">
                      <p className="text-[18px] font-semibold dl-tabular">
                        {remaining.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5 uppercase tracking-wide">
                        Remaining
                      </p>
                    </div>
                  </div>

                  {/* Partners & Method summary cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <SummaryCard
                      label="Partners"
                      value={`${partnerIds.length} selected`}
                      icon={
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--accent)] shrink-0" />
                      }
                    />
                    <SummaryCard
                      label="Method"
                      value={methodConfig?.label || method}
                      icon={
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0 opacity-50" />
                      }
                    />
                    {appliedFilters.length > 0 && (
                      <SummaryCard
                        label="Filters"
                        value={appliedFilters
                          .map(([k, v]) => formatFilterLabel(k, v))
                          .join(", ")}
                        icon={
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
                        }
                      />
                    )}
                  </div>

                  {/* Distribution Preview (multi-partner or auto_balance) */}
                  {previewData.distribution.length > 1 && (
                    <DistributionPreview
                      entries={previewData.distribution}
                      isAutoBalance={method === "auto_balance"}
                      totalRequested={previewData.willAssign}
                    />
                  )}

                  {/* Empty state */}
                  {previewData.willAssign === 0 && (
                    <div className="dl-surface rounded-[var(--radius-sm)] p-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--canvas)] border border-[var(--border-subtle)] mx-auto mb-3">
                        <SearchX className="h-5 w-5 text-[var(--text-3)]" />
                      </div>
                      <p className="text-[13px] font-medium text-[var(--text-1)]">
                        No leads match the selected filters
                      </p>
                      <p className="text-[12px] text-[var(--text-3)] mt-1">
                        Try changing the assignment method, adjusting filters,
                        or increasing the count.
                      </p>
                    </div>
                  )}

                  {/* Preview table — only when leads exist */}
                  {previewData.willAssign > 0 &&
                    previewData.previewLeads.length > 0 && (
                      <div>
                        {/* Table header with count */}
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">
                            Sample Leads
                          </p>
                          <p className="text-[11px] text-[var(--text-3)]">
                            {previewData.available <= 20
                              ? "Showing all matching leads"
                              : `Showing first 20 of ${previewData.available.toLocaleString()} eligible leads`}
                          </p>
                        </div>

                        <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
                          <div className="overflow-y-auto max-h-[280px]">
                            <table className="w-full text-[12px]">
                              <thead className="sticky top-0 z-[1]">
                                <tr className="bg-[var(--canvas)] border-b border-[var(--border-subtle)]">
                                  <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)] w-8">
                                    #
                                  </th>
                                  <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)]">
                                    Company
                                  </th>
                                  <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)] w-24">
                                    Country
                                  </th>
                                  <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)] w-28">
                                    Status
                                  </th>
                                  <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)] w-24">
                                    Assigned To
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.previewLeads.map(
                                  (
                                    lead: {
                                      id: string;
                                      company_name: string;
                                      country: string;
                                      status: string;
                                    },
                                    idx: number,
                                  ) => (
                                    <tr
                                      key={lead.id}
                                      className={`
                                        border-b border-[var(--border-subtle)] last:border-0
                                        transition-colors duration-100 hover:bg-[var(--hover-bg)]
                                        ${idx % 2 === 1 ? "bg-[var(--canvas)]/50" : ""}
                                      `}
                                    >
                                      <td className="px-3 py-1.5 text-[var(--text-3)] tabular-nums">
                                        {idx + 1}
                                      </td>
                                      <td className="px-3 py-1.5 text-[var(--text-1)] truncate max-w-[280px]">
                                        {lead.company_name}
                                      </td>
                                      <td className="px-3 py-1.5 text-[var(--text-2)]">
                                        {lead.country}
                                      </td>
                                      <td className="px-3 py-1.5 text-[var(--text-3)]">
                                        {formatStatus(lead.status)}
                                      </td>
                                      <td className="px-3 py-1.5 text-[var(--text-3)] italic">
                                        Unassigned
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Skip breakdown — only when skipped > 0 */}
                  {previewData.skipped > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-[var(--text-3)] mb-1.5 uppercase tracking-wide">
                        Skipped Because
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {previewData.skipBreakdown.alreadyAssigned > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                            <span className="text-[11px] font-medium text-amber-700">
                              Already Assigned
                            </span>
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-200 text-amber-800 text-[10px] font-semibold tabular-nums">
                              {previewData.skipBreakdown.alreadyAssigned}
                            </span>
                          </div>
                        )}
                        {previewData.skipBreakdown.noMatch > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
                            <span className="text-[11px] font-medium text-blue-700">
                              Filter Excluded
                            </span>
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-200 text-blue-800 text-[10px] font-semibold tabular-nums">
                              {previewData.skipBreakdown.noMatch}
                            </span>
                          </div>
                        )}
                        {previewData.skipBreakdown.missingData > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                            <span className="text-[11px] font-medium text-red-700">
                              Missing Data
                            </span>
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-200 text-red-800 text-[10px] font-semibold tabular-nums">
                              {previewData.skipBreakdown.missingData}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Insufficient leads warning */}
                  {previewData.available < previewData.requested &&
                    previewData.available > 0 && (
                      <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-sm)] bg-amber-50 border border-amber-200">
                        <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-700">
                          Only {previewData.available.toLocaleString()} leads
                          match. All will be assigned instead of{" "}
                          {previewData.requested.toLocaleString()}.
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 3 — Confirm
              ═══════════════════════════════════════════════════════════ */}
          {step === "confirm" && previewData && (
            <div
              className="space-y-3"
              style={{ animation: "fadeIn 150ms ease-out" }}
            >
              <div className="dl-surface rounded-[var(--radius-sm)] p-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[13px]">
                  <div>
                    <span className="text-[var(--text-3)]">Partners:</span>
                    <p className="font-medium text-[var(--text-1)]">
                      {selectedPartnerLabels}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Method:</span>
                    <p className="font-medium text-[var(--text-1)]">
                      {methodConfig?.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Requested:</span>
                    <p className="font-medium text-[var(--text-1)]">
                      {previewData.requested.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Eligible:</span>
                    <p className="font-medium text-[var(--text-1)]">
                      {previewData.matching.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">Will Assign:</span>
                    <p className="font-semibold text-[var(--status-success)]">
                      {previewData.willAssign.toLocaleString()}
                    </p>
                  </div>
                  {remaining > 0 && (
                    <div>
                      <span className="text-[var(--text-3)]">Remaining:</span>
                      <p className="font-medium text-[var(--text-1)]">
                        {remaining.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Distribution summary for multi-partner */}
                {previewData.distribution.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-[11px] text-[var(--text-3)] mb-2 uppercase tracking-wide">
                      Distribution
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {previewData.distribution.map((d) => (
                        <div
                          key={d.partnerId}
                          className="flex items-center justify-between text-[12px] px-2 py-1 rounded bg-[var(--canvas)]"
                        >
                          <span className="text-[var(--text-1)] truncate">
                            {d.partnerName}
                          </span>
                          <span className="text-[var(--status-success)] font-medium tabular-nums ml-2">
                            +{d.incoming}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 text-[12px] text-[var(--text-3)]">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>This action cannot be automatically undone.</span>
              </div>

              {/* Batch progress during execution */}
              {executeLoading && batchProgress && (
                <BatchProgress
                  current={batchProgress.current}
                  total={batchProgress.total}
                  label="Assigning leads..."
                />
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 4 — Result
              ═══════════════════════════════════════════════════════════ */}
          {step === "result" && executeResult && (
            <div
              className="space-y-3"
              style={{ animation: "fadeIn 200ms ease-out" }}
            >
              {/* Hero success */}
              <div className="dl-surface rounded-[var(--radius-sm)] p-5 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-success)]/10 mx-auto mb-3"
                  style={{
                    animation:
                      "slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <Check className="h-6 w-6 text-[var(--status-success)]" />
                </div>
                <p className="text-[15px] font-semibold text-[var(--text-1)]">
                  {executeResult.assigned.toLocaleString()} Leads Successfully
                  Assigned
                </p>
                {executeResult.distribution.length > 1 && (
                  <p className="text-[12px] text-[var(--text-3)] mt-1">
                    Across {executeResult.distribution.length} partners
                  </p>
                )}
              </div>

              {/* Assignment Report */}
              <div className="dl-surface rounded-[var(--radius-sm)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">
                    Assignment Report
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      downloadReportCSV(
                        executeResult.distribution,
                        executeResult.method,
                        executeResult.completedAt,
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download CSV
                  </button>
                </div>

                {/* Distribution table */}
                <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden mb-3">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[var(--canvas)] border-b border-[var(--border-subtle)]">
                        <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)]">
                          Partner
                        </th>
                        <th className="text-right px-3 py-1.5 font-medium text-[var(--text-3)]">
                          Assigned
                        </th>
                        <th className="text-right px-3 py-1.5 font-medium text-[var(--text-3)]">
                          Skipped
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {executeResult.distribution.map((d) => (
                        <tr
                          key={d.partnerId}
                          className="border-b border-[var(--border-subtle)] last:border-0"
                        >
                          <td className="px-3 py-1.5 text-[var(--text-1)]">
                            {d.partnerName}
                          </td>
                          <td className="px-3 py-1.5 text-right text-[var(--status-success)] font-medium tabular-nums">
                            {d.assigned.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right text-[var(--text-3)] tabular-nums">
                            {d.skipped.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[var(--text-3)]" />
                    <span className="text-[var(--text-3)]">Completed:</span>
                    <span className="font-medium text-[var(--text-1)]">
                      {executeResult.completedAt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-3)]">Method:</span>
                    <span className="font-medium text-[var(--text-1)]">
                      {executeResult.method}
                    </span>
                  </div>
                  {executeResult.duration > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-3)]">Duration:</span>
                      <span className="font-medium text-[var(--text-1)]">
                        {(executeResult.duration / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}
                  {executeResult.skipped > 0 && (
                    <div className="flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-[var(--text-3)]" />
                      <span className="text-[var(--text-3)]">Skipped:</span>
                      <span className="font-medium text-[var(--text-1)]">
                        {executeResult.skipped.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <DialogFooter>
          {step === "configure" && (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                disabled={
                  !canProceedToPreview ||
                  !requiredFieldsFilled ||
                  previewLoading
                }
                loading={previewLoading}
              >
                Preview
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("configure")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              {previewData && previewData.willAssign === 0 ? (
                <Button
                  size="sm"
                  onClick={() => setStep("configure")}
                >
                  Back to Configuration
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setStep("confirm")}
                  disabled={!previewData || previewData.willAssign === 0}
                >
                  Continue
                </Button>
              )}
            </>
          )}

          {step === "confirm" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("preview")}
                disabled={executeLoading}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={executeLoading}
                loading={executeLoading}
              >
                Assign{" "}
                {previewData?.willAssign.toLocaleString()} Leads
              </Button>
            </>
          )}

          {step === "result" && (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Close
              </Button>
              <Button size="sm" onClick={handleAssignMore}>
                Assign More Leads
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
