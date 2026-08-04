"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe, X } from "lucide-react";
import {
  SearchInput,
  Toolbar,
  ToolbarSearch,
  ToolbarFilters,
  TabGroup,
  Popover,
  PopoverTrigger,
} from "@/components/ui";

export interface ActivePartner {
  id: string;
  company_id: string;
  profiles: { full_name: string } | null;
}

interface LeadFiltersProps {
  total: number;
  filteredCount: number;
  searchParams: Record<string, string | undefined>;
  activePartners: ActivePartner[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_required", label: "Follow Up" },
  { value: "appointment_booked", label: "Appt Booked" },
  { value: "closed", label: "Closed" },
  { value: "not_interested", label: "Not Interested" },
  { value: "invalid_contact", label: "Invalid" },
];

const ASSIGNMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
];

/* ═══════════════════════════════════════════════════════════════
   Lead Filters — Using design system components
   ═══════════════════════════════════════════════════════════════ */
export function LeadFilters({
  total,
  filteredCount,
  searchParams,
  activePartners,
}: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.search || "");
  const [status, setStatus] = useState(searchParams.status || "all");
  const [assignment, setAssignment] = useState(searchParams.assignment || "all");
  const [partnerId, setPartnerId] = useState(searchParams.partner || "");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveFilters = status !== "all" || assignment !== "all" || partnerId || searchParams.search;

  const applyFilters = (overrides?: Record<string, string>) => {
    const params = new URLSearchParams();
    const s = overrides?.search ?? search;
    const st = overrides?.status ?? status;
    const a = overrides?.assignment ?? assignment;
    const p = overrides?.partner ?? partnerId;

    if (s) params.set("search", s);
    if (st && st !== "all") params.set("status", st);
    if (a && a !== "all") params.set("assignment", a);
    if (p) params.set("partner", p);

    router.push(`${pathname}${params.toString() ? "?" + params.toString() : ""}`);
  };

  // ⌘K / Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search — filters live as user types
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applyFilters({ search: value });
    }, 200);
  }, [status, assignment, partnerId, pathname, router]);

  const clearAll = () => {
    setSearch("");
    setStatus("all");
    setAssignment("all");
    setPartnerId("");
    router.push(pathname);
  };

  const selectedPartner = activePartners.find((p) => p.id === partnerId);

  return (
    <div className="space-y-3">
      {/* Search + Filter row */}
      <Toolbar>
        <ToolbarSearch>
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={handleSearchChange}
            onClear={() => { setSearch(""); applyFilters({ search: "" }); }}
            onSubmit={() => applyFilters()}
            placeholder="Search companies, emails, phones..."
          />
        </ToolbarSearch>

        <ToolbarFilters>
          {/* Partner popover */}
          <Popover
            trigger={
              <PopoverTrigger
                label={selectedPartner?.profiles?.full_name || "Partner"}
                active={!!partnerId}
                icon={<Globe className="h-3.5 w-3.5" />}
              />
            }
            options={activePartners.map((p) => ({
              value: p.id,
              label: p.profiles?.full_name || p.company_id,
            }))}
            value={partnerId}
            onChange={(v) => {
              setPartnerId(v);
              applyFilters({ partner: v });
            }}
            searchable={activePartners.length > 5}
            placeholder="Search partners..."
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 h-[32px] px-2.5 rounded-[var(--radius-sm)] dl-type-caption text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] transition-colors duration-150"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </ToolbarFilters>
      </Toolbar>

      {/* Status tabs + results count row */}
      <div className="flex items-center justify-between">
        <TabGroup
          options={STATUS_OPTIONS.map((opt) => ({
            ...opt,
            count: opt.value === "all" ? total : undefined,
          }))}
          value={status}
          onChange={(v) => {
            setStatus(v);
            applyFilters({ status: v });
          }}
        />

        {/* Results count */}
        {hasActiveFilters && (
          <p className="dl-type-caption text-[var(--text-3)] tabular-nums shrink-0 ml-4">
            {filteredCount} of {total}
          </p>
        )}
      </div>
    </div>
  );
}
