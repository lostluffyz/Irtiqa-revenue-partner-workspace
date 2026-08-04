"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Upload, UploadCloud,
  Eye, AlertTriangle, Loader2,
} from "lucide-react";
import Link from "next/link";
import { previewCsvAction, uploadCsvAction, checkDuplicatesAction } from "../actions";
import type { ImportAnalysis } from "@/lib/csv/import-engine";
import type { AmbiguityResolution } from "@/lib/csv/row-builder";
import type { DuplicateResult } from "../actions";

import {
  ImportStatus,
  ImportPreviewTable,
  DataQualitySection,
  ColumnMappingTable,
  DuplicateSection,
  IgnoredColumnsSection,
  ImportStepper,
  SuccessScreen,
  ErrorScreen,
  MissingRequiredAlert,
  AmbiguityAlert,
  AmbiguityResolver,
  TwoColumnLayout,
  StickyFooter,
  FIELD_LABELS,
} from "./components/import-components";

import type { ImportResultData } from "./components/import-components";

const MAX_PREVIEW_BYTES = 200_000;

export default function UploadLeadsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "preview" | "importing" | "done">("select");
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [ambiguityResolutions, setAmbiguityResolutions] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateResult | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Read file ──

  const readFile = useCallback((f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(f);
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStep("select");
    setAnalysis(null);
    setPreviewError(null);
    setResult(null);
    setAmbiguityResolutions({});
    setDuplicates(null);

    if (f) {
      try {
        setCsvText(await readFile(f));
      } catch {
        setPreviewError("Failed to read file");
      }
    } else {
      setCsvText(null);
    }
  }, [readFile]);

  // ── Analyze preview ──

  const handlePreview = useCallback(async () => {
    if (!csvText) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setDuplicates(null);

    try {
      const previewText = csvText.length > MAX_PREVIEW_BYTES
        ? csvText.slice(0, MAX_PREVIEW_BYTES)
        : csvText;
      const previewResult = await previewCsvAction(previewText);

      if (!previewResult.success) {
        setPreviewError(previewResult.error || "Preview analysis failed");
      } else if (previewResult.analysis) {
        setAnalysis(previewResult.analysis);
        setStep("preview");

        const initResolutions: Record<string, string> = {};
        for (const field of previewResult.analysis.mappingAnalysis.fieldResolutions) {
          if (field.ambiguous && field.candidates.length > 0) {
            initResolutions[field.canonicalField] = field.candidates[0].sourceHeader;
          }
        }
        setAmbiguityResolutions(initResolutions);

        if (previewResult.analysis.canProceed) {
          setDuplicateLoading(true);
          try {
            const dupResult = await checkDuplicatesAction(previewText);
            if (dupResult.success && dupResult.result) {
              setDuplicates(dupResult.result);
            }
          } catch {
            // silent
          } finally {
            setDuplicateLoading(false);
          }
        }
      }
    } catch {
      setPreviewError("Failed to analyze CSV. Check file format and try again.");
    } finally {
      setPreviewLoading(false);
    }
  }, [csvText]);

  // ── Execute import ──

  const handleImport = useCallback(async () => {
    if (!file || !csvText) return;
    setStep("importing");
    setResult(null);

    const formData = new FormData();
    formData.set("csvFile", file);

    const resolutionEntries = Object.entries(ambiguityResolutions);
    if (resolutionEntries.length > 0) {
      formData.set("ambiguityResolutions", JSON.stringify(
        resolutionEntries.map(([canonicalField, chosenSourceHeader]) => ({
          canonicalField,
          chosenSourceHeader,
        })),
      ));
    }

    const res = await uploadCsvAction(null, formData);
    setResult(res);
    setStep("done");
  }, [file, csvText, ambiguityResolutions]);

  const resetForm = useCallback(() => {
    setStep("select");
    setAnalysis(null);
    setPreviewError(null);
    setResult(null);
    setAmbiguityResolutions({});
    setCsvText(null);
    setFile(null);
    setDuplicates(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // ── Preview helper ──

  const getPreviewValue = (sourceHeader: string): string | null => {
    if (!analysis?.previewRows?.[0]) return null;
    const colIdx = analysis.rawHeaders.indexOf(sourceHeader);
    return colIdx >= 0 ? analysis.previewRows[0][colIdx] || null : null;
  };

  // =========================================================================
  // UI
  // =========================================================================

  return (
    <div className="max-w-7xl mx-auto pb-8">
      {/* Top nav */}
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Leads
      </Link>

      {/* Page title */}
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-1)] mb-1">
        Upload Leads
      </h1>
      <p className="text-[13px] text-[var(--text-3)] mb-6">
        Import leads from a CSV file. Headers are matched automatically.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "select") handlePreview();
          if (step === "preview") handleImport();
        }}
      >
        {/* Step 1 — Select file */}
        {step === "select" && (
          <div>
            {/* Drop zone */}
            <div
              className="rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-5 transition-colors duration-150 cursor-pointer hover:border-[var(--accent)]/30"
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              aria-label="Click to select a CSV file"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--canvas)] text-[var(--text-3)]">
                <UploadCloud className="h-6 w-6" />
              </span>
              <div>
                {file ? (
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-[var(--text-1)]">{file.name}</p>
                    <p className="text-[12px] text-[var(--text-3)] tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-[var(--text-1)]">Select a CSV file</p>
                    <p className="text-[12px] text-[var(--text-3)]">.csv · up to 5MB · max 5,000 rows</p>
                  </div>
                )}
              </div>

              <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

              <div className="flex justify-center gap-3">
                <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Choose File
                </Button>
                {file && (
                  <Button type="button" variant="ghost" onClick={(e) => { e.stopPropagation(); setFile(null); setCsvText(null); if (inputRef.current) inputRef.current.value = ""; }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Error state */}
            {previewError && (
              <div className="mt-4 flex items-start gap-3 rounded-[6px] bg-red-50 border border-red-200 p-4 text-[13px] text-red-700" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="font-medium">Error reading file</p>
                  <p className="mt-0.5 text-red-500">{previewError}</p>
                </div>
              </div>
            )}

            {file && (
              <div className="mt-5">
                <Button type="submit" loading={previewLoading} size="lg" className="w-full gap-2">
                  {previewLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Eye className="h-4 w-4" /> Preview &amp; Analyze</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Review (status + preview + confirm) */}
        {step === "preview" && analysis && (
          <div className="space-y-8">
            {/* Act 1 — Status */}
            <ImportStatus
              analysis={analysis}
              duplicates={duplicates}
              duplicateLoading={duplicateLoading}
            />

            {/* Act 2 — Review grid */}
            <TwoColumnLayout
              left={
                <div className="space-y-8">
                  {/* Preview table */}
                  <div>
                    <h2 className="text-[13px] font-semibold text-[var(--text-1)] mb-1">Import preview</h2>
                    <p className="text-[12px] text-[var(--text-3)] mb-4">First row mapped to database fields</p>
                    <ImportPreviewTable analysis={analysis} getPreviewValue={getPreviewValue} />
                  </div>

                  {/* Blocking issues */}
                  {(!analysis.canProceed || analysis.mappingAnalysis.hasMissingRequired) && (
                    <div className="bg-red-50/50 rounded-[6px] px-4 py-3">
                      <MissingRequiredAlert missingRequired={analysis.mappingAnalysis.missingRequired} />
                    </div>
                  )}

                  {/* Ambiguity resolution */}
                  {analysis.mappingAnalysis.hasAmbiguity && (
                    <div>
                      <AmbiguityAlert />
                      <div className="mt-4 space-y-4">
                        {analysis.mappingAnalysis.fieldResolutions
                          .filter((f) => f.ambiguous)
                          .map((field) => (
                            <AmbiguityResolver
                              key={field.canonicalField}
                              field={{
                                canonicalField: field.canonicalField,
                                label: FIELD_LABELS[field.canonicalField] || field.canonicalField,
                                candidates: field.candidates.map((c) => ({
                                  sourceHeader: c.sourceHeader,
                                  matchTier: c.matchTier,
                                })),
                              }}
                              currentChoice={ambiguityResolutions[field.canonicalField] || field.candidates[0]?.sourceHeader || ""}
                              onChoose={(cf, sh) => setAmbiguityResolutions((prev) => ({ ...prev, [cf]: sh }))}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Ignored columns */}
                  {analysis.mappingAnalysis.unmappedCount > 0 && (
                    <IgnoredColumnsSection headers={analysis.mappingAnalysis.unmappedHeaders} />
                  )}
                </div>
              }
              right={
                <div className="space-y-8">
                  <DataQualitySection fieldQuality={analysis.fieldQuality} />
                  <ColumnMappingTable analysis={analysis} />
                  <DuplicateSection duplicates={duplicates} loading={duplicateLoading} />
                </div>
              }
            />

            {/* Act 3 — Confirmation footer */}
            <StickyFooter
              rowCount={analysis.totalRows}
              duplicates={duplicates}
              disabled={analysis.mappingAnalysis.hasMissingRequired}
              loading={false}
              onCancel={resetForm}
            />
          </div>
        )}

        {/* Step 3 — Importing */}
        {step === "importing" && <ImportStepper currentStage="importing" />}

        {/* Step 4 — Done */}
        {step === "done" && result && (
          result.success ? (
            <SuccessScreen
              result={result}
              onViewLeads={() => router.push("/admin/leads")}
              onUploadAnother={resetForm}
            />
          ) : (
            <ErrorScreen result={result} onRetry={resetForm} />
          )
        )}
      </form>
    </div>
  );
}
