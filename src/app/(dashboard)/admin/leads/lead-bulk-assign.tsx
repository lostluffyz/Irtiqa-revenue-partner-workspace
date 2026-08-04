"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { LeadTable, type Lead } from "./lead-table";
import { SmartAssignDialog } from "./smart-assign/smart-assign-dialog";
import type { ActivePartner } from "./lead-filters";

export interface LeadBulkAssignProps {
  leads: Lead[];
  activePartners: ActivePartner[];
  total: number;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

export function LeadsBulkAssign({
  leads,
  activePartners,
  total,
  currentPage,
  totalPages,
  searchParams,
}: LeadBulkAssignProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === leads.length) {
        return new Set();
      }
      return new Set(leads.map((l) => l.id));
    });
  }, [leads]);

  const handleAssignComplete = useCallback(() => {
    setSelectedIds(new Set());
    router.refresh();
  }, [router]);

  return (
    <div>
      {/* Sticky assign bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-[52px] z-20 surface p-3 mb-4 border-[var(--accent)]/30 bg-[var(--accent-light)]/50 animate-slide-up dl-elevate-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[11px] font-semibold">
                {selectedIds.size}
              </div>
              <span className="text-[13px] font-medium text-[var(--text-1)]">
                selected
              </span>
            </div>
            <div className="w-px h-5 bg-[var(--border)]" />
            <Button
              size="sm"
              onClick={() => setAssignDialogOpen(true)}
              className="h-[30px] text-[12px]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Assign Leads
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="h-[30px] text-[12px]"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {leads.length === 0 ? (
        <div className="surface py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--canvas)] border border-[var(--border-subtle)] mx-auto mb-4">
            <svg className="h-6 w-6 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--text-1)]">
            No leads found
          </h3>
          <p className="mt-1.5 text-[13px] text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">
            {searchParams.search
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Start building your pipeline by importing leads from a CSV file."}
          </p>
        </div>
      ) : (
        <LeadTable
          leads={leads}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          searchParams={searchParams}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          isAllSelected={selectedIds.size === leads.length && leads.length > 0}
          activePartners={activePartners}
        />
      )}

      {/* Smart Assignment Dialog */}
      <SmartAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        activePartners={activePartners}
        onComplete={handleAssignComplete}
      />
    </div>
  );
}
