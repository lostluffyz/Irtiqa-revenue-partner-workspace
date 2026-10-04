"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Globe,
  Mail,
  Phone,
  Building2,
  Target,
  Upload,
  MoreHorizontal,
  Copy,
  Check,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { updateLeadStatusAction, assignLeadsAction } from "./actions";
import { formatWebsiteHostname } from "@/components/dashboard/helpers";
import type { ActivePartner } from "./lead-filters";

export interface Lead {
  id: string;
  company_name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  country: string | null;
  status: string;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  partners: { company_id: string; profiles: { full_name: string } } | null;
}

interface LeadTableProps {
  leads: Lead[];
  total: number;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  activePartners?: ActivePartner[];
}

const STATUS_CONFIG: Record<string, { variant: "info" | "default" | "warning" | "success" | "danger"; label: string; color: string }> = {
  not_contacted: { variant: "default", label: "Not Contacted", color: "bg-[#F3F4F6] text-[#6B7280]" },
  contacted: { variant: "info", label: "Contacted", color: "bg-[#EFF6FF] text-[#1A56DB]" },
  follow_up_required: { variant: "info", label: "Follow Up", color: "bg-[#EFF6FF] text-[#1A56DB]" },
  appointment_booked: { variant: "success", label: "Appt Booked", color: "bg-[#ECFDF5] text-[#047857]" },
  closed: { variant: "success", label: "Closed", color: "bg-[#ECFDF5] text-[#047857]" },
  not_interested: { variant: "danger", label: "Not Interested", color: "bg-[#FEF2F2] text-[#DC2626]" },
  invalid_contact: { variant: "danger", label: "Invalid", color: "bg-[#FEF2F2] text-[#DC2626]" },
};

const ALL_STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted", color: "bg-[#F3F4F6] text-[#6B7280]" },
  { value: "contacted", label: "Contacted", color: "bg-[#EFF6FF] text-[#1A56DB]" },
  { value: "follow_up_required", label: "Follow Up Required", color: "bg-[#EFF6FF] text-[#1A56DB]" },
  { value: "appointment_booked", label: "Appointment Booked", color: "bg-[#ECFDF5] text-[#047857]" },
  { value: "closed", label: "Closed", color: "bg-[#ECFDF5] text-[#047857]" },
  { value: "not_interested", label: "Not Interested", color: "bg-[#FEF2F2] text-[#DC2626]" },
  { value: "invalid_contact", label: "Invalid Contact", color: "bg-[#FEF2F2] text-[#DC2626]" },
];

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { variant: "default" as const, label: status, color: "bg-gray-100 text-gray-600" };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════
   Row Context Menu
   ═══════════════════════════════════════════════════════════════ */
function RowContextMenu({
  lead,
  onClose,
  onStatusChange,
  activePartners,
  onAssign,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  activePartners?: ActivePartner[];
  onAssign: (leadId: string, partnerId: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [showAssignSubmenu, setShowAssignSubmenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div ref={ref} className="context-menu" role="menu">
      {/* Copy actions */}
      {lead.email && (
        <button
          type="button"
          className="context-menu-item"
          role="menuitem"
          onClick={() => { copyToClipboard(lead.email!, "email"); onClose(); }}
        >
          {copied === "email" ? <Check className="h-3.5 w-3.5 text-[var(--status-success)]" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Email
          {copied === "email" && <span className="ml-auto text-[11px] text-[var(--status-success)]">Copied!</span>}
        </button>
      )}
      {lead.phone && (
        <button
          type="button"
          className="context-menu-item"
          role="menuitem"
          onClick={() => { copyToClipboard(lead.phone!, "phone"); onClose(); }}
        >
          {copied === "phone" ? <Check className="h-3.5 w-3.5 text-[var(--status-success)]" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Phone
          {copied === "phone" && <span className="ml-auto text-[11px] text-[var(--status-success)]">Copied!</span>}
        </button>
      )}
      {lead.website && (
        <button
          type="button"
          className="context-menu-item"
          role="menuitem"
          onClick={() => { copyToClipboard(lead.website!, "website"); onClose(); }}
        >
          {copied === "website" ? <Check className="h-3.5 w-3.5 text-[var(--status-success)]" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Website
          {copied === "website" && <span className="ml-auto text-[11px] text-[var(--status-success)]">Copied!</span>}
        </button>
      )}

      <div className="context-menu-divider" />

      {/* Status change */}
      <div className="relative">
        <button
          type="button"
          className="context-menu-item w-full"
          role="menuitem"
          onClick={() => { setShowStatusSubmenu(!showStatusSubmenu); setShowAssignSubmenu(false); }}
        >
          <Badge variant={getStatusConfig(lead.status).variant} className="text-[11px]">
            {getStatusConfig(lead.status).label}
          </Badge>
          <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-150 ${showStatusSubmenu ? "rotate-180" : ""}`} />
        </button>
        {showStatusSubmenu && (
          <div className="status-dropdown" role="menu">
            {ALL_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`status-option ${lead.status === opt.value ? "status-option-active" : ""}`}
                role="menuitem"
                onClick={() => {
                  onStatusChange(lead.id, opt.value);
                  onClose();
                }}
              >
                <Badge variant={getStatusConfig(opt.value).variant} className="text-[10px]">
                  {opt.label}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Partner assignment */}
      {activePartners && activePartners.length > 0 && (
        <div className="relative">
          <button
            type="button"
            className="context-menu-item w-full"
            role="menuitem"
            onClick={() => { setShowAssignSubmenu(!showAssignSubmenu); setShowStatusSubmenu(false); }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {lead.partners ? `Assigned to ${lead.partners.profiles?.full_name}` : "Assign Partner"}
            <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-150 ${showAssignSubmenu ? "rotate-180" : ""}`} />
          </button>
          {showAssignSubmenu && (
            <div className="status-dropdown max-h-64 overflow-y-auto" role="menu">
              <button
                type="button"
                className={`status-option ${!lead.assigned_to ? "status-option-active" : ""}`}
                role="menuitem"
                onClick={() => {
                  onAssign(lead.id, "");
                  onClose();
                }}
              >
                Unassigned
              </button>
              {activePartners.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`status-option ${lead.assigned_to === p.id ? "status-option-active" : ""}`}
                  role="menuitem"
                  onClick={() => {
                    onAssign(lead.id, p.id);
                    onClose();
                  }}
                >
                  <span className="truncate">{p.profiles?.full_name || p.company_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Inline Status Badge (clickable)
   ═══════════════════════════════════════════════════════════════ */
function InlineStatusBadge({
  lead,
  onStatusChange,
}: {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = getStatusConfig(lead.status);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = async (newStatus: string) => {
    if (newStatus === lead.status) { setOpen(false); return; }
    setLoading(true);
    try {
      await updateLeadStatusAction(lead.id, newStatus);
      onStatusChange(lead.id, newStatus);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={`status-badge-interactive ${loading ? "opacity-60 pointer-events-none" : ""}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={loading}
      >
        <Badge variant={config.variant} className="whitespace-nowrap">
          {loading ? "Saving..." : config.label}
        </Badge>
      </button>
      {open && (
        <div className="status-dropdown" role="menu">
          {ALL_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`status-option ${lead.status === opt.value ? "status-option-active" : ""}`}
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); handleChange(opt.value); }}
            >
              <Badge variant={getStatusConfig(opt.value).variant} className="text-[10px]">
                {opt.label}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Table Component
   ═══════════════════════════════════════════════════════════════ */
export function LeadTable({
  leads,
  total,
  currentPage,
  totalPages,
  searchParams,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  activePartners,
}: LeadTableProps) {
  const [contextMenuLeadId, setContextMenuLeadId] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<Record<string, string>>({});
  const [leadPartners, setLeadPartners] = useState<Record<string, Lead["partners"]>>({});
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Get effective status (optimistic update)
  const getStatus = useCallback((lead: Lead) => {
    return leadStatuses[lead.id] || lead.status;
  }, [leadStatuses]);

  // Get effective partner (optimistic update)
  const getPartner = useCallback((lead: Lead) => {
    return leadPartners[lead.id] !== undefined ? leadPartners[lead.id] : lead.partners;
  }, [leadPartners]);

  // Keyboard navigation
  const handleRowKeyDown = useCallback((e: React.KeyboardEvent, lead: Lead) => {
    const rows = tbodyRef.current?.querySelectorAll('tr[role="row"]');
    if (!rows) return;

    const currentIndex = Array.from(rows).indexOf(e.currentTarget as HTMLTableRowElement);

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = rows[currentIndex + 1] as HTMLTableRowElement;
        next?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = rows[currentIndex - 1] as HTMLTableRowElement;
        prev?.focus();
        break;
      }
      case " ": {
        e.preventDefault();
        onToggleSelect(lead.id);
        break;
      }
      case "Escape": {
        setContextMenuLeadId(null);
        break;
      }
    }
  }, [onToggleSelect]);

  // Status change handler
  const handleStatusChange = useCallback((leadId: string, newStatus: string) => {
    setLeadStatuses((prev) => ({ ...prev, [leadId]: newStatus }));
  }, []);

  // Partner assignment handler
  const handleAssign = useCallback(async (leadId: string, partnerId: string) => {
    try {
      const formData = new FormData();
      formData.set("leadIds", JSON.stringify([leadId]));
      formData.set("partnerId", partnerId);
      await assignLeadsAction(null, formData);

      // Optimistic update
      const partner = partnerId
        ? activePartners?.find((p) => p.id === partnerId) || null
        : null;
      setLeadPartners((prev) => ({
        ...prev,
        [leadId]: partner
          ? { company_id: partner.company_id, profiles: partner.profiles as { full_name: string } }
          : null,
      }));
    } catch {
      // silent
    }
  }, [activePartners]);

  return (
    <div>
      {/* Table — desktop and larger */}
      <div className="surface overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            {/* Header */}
            <thead>
              <tr className="border-b border-[var(--border)] bg-[#FAFAF8]">
                <th className="w-12 px-4 py-3 text-left sticky top-0 bg-[#FAFAF8] z-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="lead-checkbox"
                    aria-label="Select all leads"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] sticky top-0 bg-[#FAFAF8] z-10">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] sticky top-0 bg-[#FAFAF8] z-10 w-[210px]">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] sticky top-0 bg-[#FAFAF8] z-10 hidden min-[1500px]:table-cell w-[150px]">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] sticky top-0 bg-[#FAFAF8] z-10 w-[130px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] sticky top-0 bg-[#FAFAF8] z-10 hidden md:table-cell w-[190px]">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-3)] sticky top-0 bg-[#FAFAF8] z-10 hidden min-[1500px]:table-cell w-[100px]">
                  Created
                </th>
                <th className="w-10 px-2 sticky top-0 bg-[#FAFAF8] z-10" />
              </tr>
            </thead>

            {/* Body */}
            <tbody ref={tbodyRef}>
              {leads.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const effectiveStatus = getStatus(lead);
                const effectivePartner = getPartner(lead);
                const isContextMenuOpen = contextMenuLeadId === lead.id;

                return (
                  <tr
                    key={lead.id}
                    tabIndex={0}
                    role="row"
                    aria-selected={isSelected}
                    className={`leads-row border-b border-[var(--border-subtle)] last:border-0 group ${
                      isSelected ? "leads-row-selected" : ""
                    }`}
                    onKeyDown={(e) => handleRowKeyDown(e, lead)}
                  >
                    {/* Checkbox */}
                    <td className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(lead.id)}
                        className="lead-checkbox"
                        aria-label={`Select ${lead.company_name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0 max-w-[280px]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--hover-bg)]">
                          <Building2 className="h-4 w-4 text-[var(--text-2)]" />
                        </div>
                        <div className="min-w-0">
                          <span
                            className="block text-[13px] font-semibold text-[var(--text-1)] truncate"
                            title={lead.company_name}
                          >
                            {lead.company_name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                title={lead.website}
                                className="text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] truncate flex items-center gap-1 min-w-0 transition-colors duration-150"
                              >
                                <Globe className="h-3 w-3 shrink-0" />
                                <span className="truncate">{formatWebsiteHostname(lead.website)}</span>
                              </a>
                            )}
                            {lead.industry && (
                              <span className="industry-subtitle text-[11px] text-[var(--text-3)] truncate hidden sm:inline">
                                {!lead.website && <span className="mr-1">·</span>}
                                {lead.industry}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        {lead.email ? (
                          <div
                            className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] truncate max-w-[200px]"
                            title={lead.email}
                          >
                            <Mail className="h-3 w-3 shrink-0 text-[var(--text-3)]" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[var(--text-3)]">—</span>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)] truncate max-w-[200px] mt-0.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-4 py-3 hidden min-[1500px]:table-cell">
                      {lead.industry ? (
                        <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] truncate max-w-[140px]">
                          <Building2 className="h-3 w-3 shrink-0 text-[var(--text-3)]" />
                          {lead.industry}
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--text-3)]">—</span>
                      )}
                    </td>

                    {/* Status — interactive badge */}
                    <td className="px-4 py-3">
                      <InlineStatusBadge
                        lead={{ ...lead, status: effectiveStatus }}
                        onStatusChange={handleStatusChange}
                      />
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {effectivePartner ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={effectivePartner.profiles?.full_name || "Unknown"} size="sm" />
                          <span
                            className="text-[12px] text-[var(--text-2)] truncate max-w-[170px]"
                            title={effectivePartner.profiles?.full_name || undefined}
                          >
                            {effectivePartner.profiles?.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--text-3)] italic">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 hidden min-[1500px]:table-cell">
                      <span className="text-[12px] text-[var(--text-3)] tabular-nums">
                        {formatDate(lead.created_at)}
                      </span>
                    </td>

                    {/* Actions — context menu trigger */}
                    <td className="px-2 py-3 relative">
                      <button
                        type="button"
                        className={`p-1 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150
                          md:opacity-0 md:group-hover:opacity-100
                          ${isContextMenuOpen ? "opacity-100" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuLeadId(isContextMenuOpen ? null : lead.id);
                        }}
                        aria-label={`Actions for ${lead.company_name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {isContextMenuOpen && (
                        <RowContextMenu
                          lead={{ ...lead, status: effectiveStatus, partners: effectivePartner }}
                          onClose={() => setContextMenuLeadId(null)}
                          onStatusChange={handleStatusChange}
                          activePartners={activePartners}
                          onAssign={handleAssign}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards — below md, same data and handlers as the table */}
      <div className="space-y-2 md:hidden">
        {leads.map((lead) => {
          const isSelected = selectedIds.has(lead.id);
          const effectiveStatus = getStatus(lead);
          const effectivePartner = getPartner(lead);
          const isContextMenuOpen = contextMenuLeadId === lead.id;

          return (
            <div
              key={lead.id}
              className={`surface p-3 ${isSelected ? "leads-row-selected" : ""}`}
            >
              <div className="flex items-center gap-1">
                <label className="flex h-11 w-11 shrink-0 -m-2 items-center justify-center">
                  <span className="sr-only">Select {lead.company_name}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    className="lead-checkbox h-5 w-5"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[14px] font-semibold text-[var(--text-1)] leading-snug line-clamp-2"
                    title={lead.company_name}
                  >
                    {lead.company_name}
                  </p>
                  {lead.website && (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      title={lead.website}
                      className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--text-3)]"
                    >
                      <Globe className="h-3 w-3 shrink-0" />
                      <span className="truncate">{formatWebsiteHostname(lead.website)}</span>
                    </a>
                  )}
                </div>
                <div className="shrink-0">
                  <InlineStatusBadge
                    lead={{ ...lead, status: effectiveStatus }}
                    onStatusChange={handleStatusChange}
                  />
                </div>
                <div className="relative shrink-0 -mr-2">
                  <button
                    type="button"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuLeadId(isContextMenuOpen ? null : lead.id);
                    }}
                    aria-label={`Actions for ${lead.company_name}`}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {isContextMenuOpen && (
                    <RowContextMenu
                      lead={{ ...lead, status: effectiveStatus, partners: effectivePartner }}
                      onClose={() => setContextMenuLeadId(null)}
                      onStatusChange={handleStatusChange}
                      activePartners={activePartners}
                      onAssign={handleAssign}
                    />
                  )}
                </div>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] pt-2 text-[12px]">
                {lead.phone && (
                  <span className="inline-flex items-center gap-1 text-[var(--text-2)] tabular-nums">
                    <Phone className="h-3 w-3 shrink-0 text-[var(--text-3)]" />
                    {lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span
                    className="inline-flex min-w-0 max-w-full items-center gap-1 text-[var(--text-2)]"
                    title={lead.email}
                  >
                    <Mail className="h-3 w-3 shrink-0 text-[var(--text-3)]" />
                    <span className="truncate">{lead.email}</span>
                  </span>
                )}
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span className="shrink-0 text-[var(--text-3)]">Assigned to</span>
                  {effectivePartner ? (
                    <span className="truncate font-medium text-[var(--text-1)]">
                      {effectivePartner.profiles?.full_name}
                    </span>
                  ) : (
                    <span className="italic text-[var(--text-3)]">Unassigned</span>
                  )}
                </span>
                <span className="ml-auto shrink-0 tabular-nums text-[var(--text-3)]">
                  {formatDate(lead.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-center gap-4 border-t border-[var(--border-subtle)] bg-[var(--canvas)]/95 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <p className="text-[12px] text-[var(--text-3)] tabular-nums">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-1.5">
            {currentPage > 1 && (
              <Link
                href={{
                  pathname: "/admin/leads",
                  query: { ...searchParams, page: String(currentPage - 1) },
                }}
              >
                <Button variant="ghost" size="sm" className="h-[32px] min-h-[44px] text-[12px] md:min-h-0">
                  Previous
                </Button>
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{
                  pathname: "/admin/leads",
                  query: { ...searchParams, page: String(currentPage + 1) },
                }}
              >
                <Button variant="ghost" size="sm" className="h-[32px] min-h-[44px] text-[12px] md:min-h-0">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
      {/* Clearance so the sticky pagination never covers the last card */}
      <div aria-hidden="true" className="h-3" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Empty States
   ═══════════════════════════════════════════════════════════════ */
export function LeadsEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="surface py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--canvas)] border border-[var(--border-subtle)] mx-auto mb-4">
        <Target className="h-6 w-6 text-[var(--text-3)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--text-1)]">
        {hasFilters ? "No leads match your filters" : "No leads yet"}
      </h3>
      <p className="mt-1.5 text-[13px] text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Start building your pipeline by importing leads from a CSV file."}
      </p>
      {!hasFilters && (
        <div className="mt-6">
          <Link href="/admin/leads/upload">
            <Button size="sm" className="h-[34px]">
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════════════════════ */
export function LeadsTableSkeleton() {
  return (
    <div className="surface overflow-hidden">
      {/* Header skeleton */}
      <div className="bg-[#FAFAF8] border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-8">
          <div className="h-4 w-4 skeleton rounded" />
          <div className="h-3 w-32 skeleton rounded" />
          <div className="h-3 w-24 skeleton rounded" />
          <div className="h-3 w-20 skeleton rounded hidden min-[1500px]:block" />
          <div className="h-3 w-20 skeleton rounded" />
          <div className="h-3 w-24 skeleton rounded hidden md:block" />
        </div>
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border-b border-[var(--border-subtle)] last:border-0 px-4 py-3"
        >
          <div className="flex items-center gap-8">
            <div className="h-4 w-4 skeleton rounded" />
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 skeleton rounded-lg shrink-0" />
              <div>
                <div className="h-3.5 w-32 skeleton rounded mb-1.5" />
                <div className="h-2.5 w-24 skeleton rounded" />
              </div>
            </div>
            <div>
              <div className="h-3 w-28 skeleton rounded mb-1.5" />
              <div className="h-2.5 w-20 skeleton rounded" />
            </div>
            <div className="hidden lg:block">
              <div className="h-3 w-20 skeleton rounded" />
            </div>
            <div>
              <div className="h-5 w-20 skeleton rounded-full" />
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 skeleton rounded-lg" />
                <div className="h-3 w-20 skeleton rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
