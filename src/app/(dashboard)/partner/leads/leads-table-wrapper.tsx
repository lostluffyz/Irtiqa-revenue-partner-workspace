"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Target,
  Phone,
  PhoneCall,
  Mail,
  Eye,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  TrendingUp,
  CalendarCheck,
} from "lucide-react";
import { StatusBadge } from "./lead-status-update";
import { LeadDetailsDrawer } from "./lead-details-drawer";
import type { Lead } from "@/types/database";

// ============================================
// Helpers
// ============================================

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================
// Props
// ============================================

interface LeadsTableWrapperProps {
  leads: Lead[];
  page: number;
  totalPages: number;
  total: number;
  search?: string;
  status?: string;
  stats: {
    total: number;
    contacted: number;
    followUp: number;
    appointments: number;
  };
}

// ============================================
// Summary Tiles (same page-loaded numbers)
// ============================================

function SummaryTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[var(--radius-soft-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-soft-md)] bg-[var(--hover-bg)] text-[var(--text-2)]">
        {icon}
      </div>
      <p className="mt-2 text-[20px] font-bold leading-none tracking-[-0.01em] text-[var(--text-1)] tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[12px] font-medium text-[var(--text-2)]">
        {label}
      </p>
    </div>
  );
}

// ============================================
// LeadRow
// ============================================

function LeadRow({
  lead,
  isSelected,
  onSelect,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`
        group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3
        rounded-[var(--radius-soft-lg)] border border-[var(--border)] bg-[var(--surface)]
        p-4 shadow-[var(--shadow-soft)]
        cursor-pointer select-none
        transition-shadow duration-150 hover:shadow-[var(--shadow-lift)]
        focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
        ${isSelected ? "ring-2 ring-[var(--accent)]/40 bg-[var(--accent-light)]/40" : ""}
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`View details for ${lead.company_name}`}
    >
      {/* Avatar — neutral tile */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-soft-md)] bg-[var(--hover-bg)] text-[var(--text-2)]">
        <Building2 className="h-5 w-5" />
      </div>

      {/* Center: name, industry pill, meta */}
      <div className="min-w-0">
        <h3
          className="text-[14px] font-semibold text-[var(--text-1)] leading-snug line-clamp-2 md:line-clamp-1 md:truncate"
          title={lead.company_name}
        >
          {lead.company_name}
        </h3>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          {lead.industry && (
            <span className="max-w-[160px] truncate rounded-[var(--radius-soft-pill)] bg-[var(--hover-bg)] px-2 py-0.5 text-[11px] text-[var(--text-2)]">
              {lead.industry}
            </span>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-3 text-[12px]">
          {lead.phone ? (
            <span className="flex min-w-0 items-center gap-1 text-[var(--text-2)] tabular-nums">
              <Phone className="h-3 w-3 shrink-0 text-[var(--text-3)]" />
              <span className="truncate">{lead.phone}</span>
            </span>
          ) : (
            <span className="text-[var(--text-3)]">No phone</span>
          )}
          {lead.country && (
            <span className="flex min-w-0 items-center gap-1 text-[var(--text-2)]">
              <MapPin className="h-3 w-3 shrink-0 text-[var(--text-3)]" />
              <span className="truncate">{lead.country}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: fixed column — status, date, quick actions */}
      <div className="flex w-[132px] shrink-0 flex-col items-end gap-1.5">
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge lead={lead} />
        </div>
        <span
          className="text-[11px] text-[var(--text-3)] tabular-nums"
          title={lead.assigned_at || undefined}
        >
          {lead.assigned_at ? formatRelativeDate(lead.assigned_at) : "—"}
        </span>
        <div className="flex items-center gap-0.5 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="flex min-h-[44px] min-w-[40px] items-center justify-center rounded-[var(--radius-soft-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 md:min-h-0 md:min-w-0 md:p-1.5"
            aria-label="View lead details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-h-[44px] min-w-[40px] items-center justify-center rounded-[var(--radius-soft-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 md:min-h-0 md:min-w-0 md:p-1.5"
              aria-label={`Call ${lead.company_name}`}
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-h-[44px] min-w-[40px] items-center justify-center rounded-[var(--radius-soft-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 md:min-h-0 md:min-w-0 md:p-1.5"
              aria-label={`Email ${lead.company_name}`}
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadsTableWrapper({
  leads,
  page,
  totalPages,
  total,
  search,
  status,
  stats,
}: LeadsTableWrapperProps) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(search || "");

  const handleNavigate = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (searchValue) params.set("search", searchValue);
      if (status && status !== "all") params.set("status", status);
      router.push(`/partner/leads?${params.toString()}`);
    },
    [searchValue, status, router],
  );

  // Same URL params as the previous select: ?search=&status= (omitted when "all")
  const applyStatusFilter = useCallback(
    (newStatus: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (newStatus && newStatus !== "all") params.set("status", newStatus);
      router.push(`/partner/leads?${params.toString()}`);
    },
    [search, router],
  );

  const handleClearFilters = useCallback(() => {
    setSearchValue("");
    router.push("/partner/leads");
  }, [router]);

  // Counts shown only where the page already loads them (stats prop).
  const statusChips = [
    { value: "all", label: "All", count: stats.total as number | undefined },
    { value: "not_contacted", label: "Not Contacted", count: undefined as number | undefined },
    { value: "contacted", label: "Contacted", count: stats.contacted as number | undefined },
    { value: "follow_up_required", label: "Follow Up", count: stats.followUp as number | undefined },
    { value: "appointment_booked", label: "Appt Booked", count: stats.appointments as number | undefined },
    { value: "closed", label: "Closed", count: undefined as number | undefined },
    { value: "not_interested", label: "Not Interested", count: undefined as number | undefined },
    { value: "invalid_contact", label: "Invalid", count: undefined as number | undefined },
  ];

  const hasFilters = Boolean(search || (status && status !== "all"));

  // Pagination
  const PAGE_SIZE = 50;
  const startIdx = (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  // Build page URLs
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    return `/partner/leads?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* ─── Header + Stats ─── */}
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          My Leads
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-3)]">
          Manage and track your assigned leads.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryTile
            icon={<Target className="h-4 w-4" />}
            value={stats.total}
            label="Assigned"
          />
          <SummaryTile
            icon={<PhoneCall className="h-4 w-4" />}
            value={stats.contacted}
            label="Contacted"
          />
          <SummaryTile
            icon={<CalendarCheck className="h-4 w-4" />}
            value={stats.followUp}
            label="Follow-up"
          />
          <SummaryTile
            icon={<TrendingUp className="h-4 w-4" />}
            value={stats.appointments}
            label="Appointments"
          />
        </div>
      </div>

      {/* ─── Filter Toolbar (sticky) ─── */}
      <div className="sticky top-0 z-20 bg-[var(--canvas)] -mx-6 px-6 py-3 border-b border-[var(--border-subtle)]">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search leads"
              aria-label="Search leads"
              className="w-full min-h-[44px] md:min-h-0 pl-9 pr-9 py-2 text-[13px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-soft-sm)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] transition-all duration-150"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  const params = new URLSearchParams();
                  if (status && status !== "all") params.set("status", status);
                  router.push(`/partner/leads?${params.toString()}`);
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-1 items-center justify-center rounded-[var(--radius-soft-xs)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex min-h-[44px] md:min-h-0 items-center gap-1 px-2.5 rounded-[var(--radius-soft-xs)] text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150 whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </form>
        {/* Status chips — same values/params as the previous select */}
        <div
          className="chip-row-fade mt-3 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          role="group"
          aria-label="Filter by status"
        >
          {statusChips.map((opt) => {
            const isActive = (status || "all") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => applyStatusFilter(opt.value)}
                aria-pressed={isActive}
                className={`inline-flex h-[32px] min-h-[44px] md:min-h-0 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-soft-pill)] border px-3 text-[12px] font-medium tabular-nums transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 ${
                  isActive
                    ? "border-transparent bg-[var(--text-1)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                {opt.label}
                {opt.count !== undefined && (
                  <span className={isActive ? "text-white/70" : "text-[var(--text-3)]"}>
                    ({opt.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Lead List ─── */}
      <div>
        {leads.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={
                hasFilters ? (
                  <Search className="h-6 w-6" />
                ) : (
                  <Target className="h-6 w-6" />
                )
              }
              title={hasFilters ? "No matches found" : "No leads yet"}
              description={
                hasFilters
                  ? "Try a different search term or filter."
                  : "You haven't been assigned any leads yet."
              }
              action={
                hasFilters ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-4 text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isSelected={selectedLeadId === lead.id}
                onSelect={() => setSelectedLeadId(lead.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Pagination ─── */}
      {total > 0 && (
        <div className="sticky bottom-0 z-10 flex flex-col items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--canvas)]/95 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:flex-row md:justify-between">
          <span className="text-[12px] text-[var(--text-3)] tabular-nums">
            {totalPages > 1
              ? `Showing ${startIdx}–${endIdx} of ${total} leads`
              : `${total} lead${total === 1 ? "" : "s"}`}
          </span>
          {totalPages > 1 && (
            <div className="inline-flex items-center gap-1 rounded-[var(--radius-soft-pill)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 shadow-[var(--shadow-soft)]">
              {page > 1 && (
                <a href={buildPageUrl(page - 1)}>
                  <Button variant="ghost" size="sm" className="min-h-[44px] md:min-h-0">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                </a>
              )}
              <span className="px-2 text-[12px] text-[var(--text-2)] tabular-nums whitespace-nowrap">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a href={buildPageUrl(page + 1)}>
                  <Button variant="ghost" size="sm" className="min-h-[44px] md:min-h-0">
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      )}
      {/* Clearance so the sticky bar never covers the last card */}
      <div aria-hidden="true" className="h-3" />

      {/* ─── Lead Details Drawer ─── */}
      <LeadDetailsDrawer
        leadId={selectedLeadId || ""}
        open={selectedLeadId !== null}
        onClose={handleClose}
        leads={leads}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
