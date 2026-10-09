"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export interface FilterRegion {
  id: string;
  name: string;
}

interface PartnerFiltersProps {
  total: number;
  filteredCount: number;
  activeCount?: number;
  inactiveCount?: number;
  suspendedCount?: number;
  searchParams: Record<string, string | undefined>;
  regions: FilterRegion[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

/* ═══════════════════════════════════════════════════════════════
   Partner Filters — Using new design system components
   ═══════════════════════════════════════════════════════════════ */
export function PartnerFilters({
  total,
  filteredCount,
  activeCount,
  inactiveCount,
  suspendedCount,
  searchParams,
  regions,
}: PartnerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.search || "");
  const [status, setStatus] = useState(searchParams.status || "all");
  const [regionId, setRegionId] = useState(searchParams.region || "");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveFilters = status !== "all" || regionId || searchParams.search;

  const applyFilters = (overrides?: Record<string, string>) => {
    const params = new URLSearchParams();
    const s = overrides?.search ?? search;
    const st = overrides?.status ?? status;
    const r = overrides?.region ?? regionId;

    if (s) params.set("search", s);
    if (st && st !== "all") params.set("status", st);
    if (r) params.set("region", r);

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
  }, [status, regionId, pathname, router]);

  const clearAll = () => {
    setSearch("");
    setStatus("all");
    setRegionId("");
    router.push(pathname);
  };

  const selectedRegion = regions.find((r) => r.id === regionId);

  return (
    <div className="space-y-3">
      {/* Search + Region row — wraps on small screens so the page never scrolls sideways */}
      <Toolbar className="flex-wrap">
        <ToolbarSearch className="max-sm:basis-full">
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={handleSearchChange}
            onClear={() => { setSearch(""); applyFilters({ search: "" }); }}
            onSubmit={() => applyFilters()}
            placeholder="Search partners"
          />
        </ToolbarSearch>

        <ToolbarFilters>
          {/* Region popover */}
          <Popover
            trigger={
              <PopoverTrigger
                label={selectedRegion?.name || "Region"}
                active={!!regionId}
                icon={<Globe className="h-3.5 w-3.5" />}
              />
            }
            options={regions.map((r) => ({
              value: r.id,
              label: r.name,
            }))}
            value={regionId}
            onChange={(v) => {
              setRegionId(v);
              applyFilters({ region: v });
            }}
            searchable={regions.length > 5}
            placeholder="Search regions..."
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
      <div className="flex items-center gap-3">
        <div className="chip-row-fade min-w-0 flex-1 overflow-x-auto pb-1 -mx-1 px-1 [&>div]:w-max">
          <TabGroup
            options={STATUS_OPTIONS.map((opt) => ({
              ...opt,
              count: opt.value === "all"
                ? total
                : opt.value === "active"
                  ? activeCount
                  : opt.value === "inactive"
                    ? inactiveCount
                    : opt.value === "suspended"
                      ? suspendedCount
                      : undefined,
            }))}
            value={status}
            onChange={(v) => {
              setStatus(v);
              applyFilters({ status: v });
            }}
          />
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="dl-type-caption text-[var(--text-3)] tabular-nums shrink-0">
            {filteredCount} of {total}
          </p>
        )}
      </div>
    </div>
  );
}
