"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Target,
  Phone,
  Mail,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "./lead-status-update";
import { LeadDetailsDrawer } from "./lead-details-drawer";
import type { Lead } from "@/types/database";

// ============================================
// Avatar Colors (soft tints)
// ============================================

const AVATAR_COLORS = [
  "bg-[#EFF6FF] text-[#1A56DB]", // blue
  "bg-[#ECFDF5] text-[#059669]", // green
  "bg-[#FFFBEB] text-[#D97706]", // amber
  "bg-[#F5F3FF] text-[#7C3AED]", // purple
  "bg-[#FDF2F8] text-[#DB2777]", // pink
  "bg-[#ECFEFF] text-[#0891B2]", // cyan
];

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
// StatChip
// ============================================

function StatChip({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[13px] font-semibold text-[var(--text-1)] tabular-nums">
        {count}
      </span>
      <span className="text-[12px] text-[var(--text-3)]">{label}</span>
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
  const [isHovered, setIsHovered] = useState(false);

  const avatarColor =
    AVATAR_COLORS[lead.company_name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div
      className={`
        group flex items-center gap-4 px-4 py-3.5
        cursor-pointer select-none
        border-l-[3px]
        ${
          isSelected
            ? "bg-[var(--accent-light)] border-l-[var(--accent)]"
            : "border-l-transparent"
        }
        ${
          isHovered && !isSelected
            ? "bg-[var(--hover-bg)] -translate-y-px shadow-[var(--shadow-1)]"
            : ""
        }
      `}
      style={{ transition: "background-color 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out" }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-[14px] font-semibold shrink-0 ${avatarColor}`}
      >
        {lead.company_name.charAt(0).toUpperCase()}
      </div>

      {/* Lead Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-[var(--text-1)] truncate line-clamp-1">
            {lead.company_name}
          </h3>
          {lead.industry && (
            <span className="text-[11px] text-[var(--text-3)] truncate line-clamp-1 hidden sm:inline">
              {lead.industry}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {lead.email && (
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-3)] truncate line-clamp-1 max-w-[200px]">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </span>
          )}
          {lead.phone && (
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-3)] shrink-0">
              <Phone className="h-3 w-3" />
              {lead.phone}
            </span>
          )}
        </div>
        {lead.country && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-[var(--text-3)] shrink-0" />
            <span className="text-[11px] text-[var(--text-3)] truncate line-clamp-1">
              {lead.country}
            </span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <StatusBadge lead={lead} />
      </div>

      {/* Assigned Date */}
      <div className="text-[11px] text-[var(--text-3)] tabular-nums w-16 text-right shrink-0 hidden sm:block">
        {lead.assigned_at ? formatRelativeDate(lead.assigned_at) : "—"}
      </div>

      {/* Quick Actions (hover reveal) */}
      <div
        className={`
          items-center gap-1 shrink-0
          transition-opacity duration-150
          ${isHovered ? "opacity-100" : "opacity-0"}
          hidden sm:flex
        `}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--border-subtle)] transition-colors duration-150 active:scale-95"
          aria-label="View lead details"
        >
          <Eye className="h-4 w-4 text-[var(--text-3)]" />
        </button>
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--border-subtle)] transition-colors duration-150 active:scale-95"
            aria-label="Call"
          >
            <Phone className="h-4 w-4 text-[var(--text-3)]" />
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--border-subtle)] transition-colors duration-150 active:scale-95"
            aria-label="Email"
          >
            <Mail className="h-4 w-4 text-[var(--text-3)]" />
          </a>
        )}
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

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value;
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
        <div className="flex items-center gap-5 mt-3 flex-wrap">
          <StatChip count={stats.total} label="assigned" color="var(--accent)" />
          <StatChip
            count={stats.contacted}
            label="contacted"
            color="var(--status-info, #3B82F6)"
          />
          <StatChip
            count={stats.followUp}
            label="follow-up"
            color="var(--status-warning, #F59E0B)"
          />
          <StatChip
            count={stats.appointments}
            label="appointments"
            color="var(--status-success, #10B981)"
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
              placeholder="Search leads..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] transition-all duration-150"
            />
          </div>
          <select
            value={status || "all"}
            onChange={handleStatusChange}
            className="px-3 py-2 text-[13px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)] transition-all duration-150 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="not_contacted">Not Contacted</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up_required">Follow Up</option>
            <option value="appointment_booked">Appt Booked</option>
            <option value="closed">Closed</option>
            <option value="not_interested">Not Interested</option>
            <option value="invalid_contact">Invalid</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150 whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </form>
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
          <div className="divide-y divide-[var(--border-subtle)]">
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
        <div className="flex items-center justify-between pt-2">
          <span className="text-[12px] text-[var(--text-3)] tabular-nums">
            {totalPages > 1
              ? `Showing ${startIdx}–${endIdx} of ${total} leads`
              : `${total} lead${total === 1 ? "" : "s"}`}
          </span>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <a href={buildPageUrl(page - 1)}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
              </a>
            )}
            {page < totalPages && (
              <a href={buildPageUrl(page + 1)}>
                <Button variant="ghost" size="sm">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
            {totalPages > 1 && (
              <span className="text-[12px] text-[var(--text-2)] tabular-nums ml-2 hidden sm:inline">
                Page {page} of {totalPages}
              </span>
            )}
          </div>
        </div>
      )}

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
