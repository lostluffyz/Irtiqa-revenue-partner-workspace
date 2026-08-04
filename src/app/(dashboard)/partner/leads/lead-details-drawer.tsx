"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  fetchLeadDetailsAction,
  type LeadDetail,
  type StatusHistoryEntry,
} from "../actions";
import {
  DrawerStatusSection,
  DrawerCompanySection,
  DrawerTimelineSection,
  DrawerNotesSection,
} from "./drawer-sections";
import type { Lead } from "@/types/database";
import type { LeadStatus } from "@/types/database";

// ============================================
// Status Constants (shared with page)
// ============================================

const STATUS_VARIANTS: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  not_contacted: "default",
  contacted: "info",
  follow_up_required: "warning",
  appointment_booked: "success",
  closed: "success",
  not_interested: "danger",
  invalid_contact: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  follow_up_required: "Follow Up",
  appointment_booked: "Appt Booked",
  closed: "Closed",
  not_interested: "Not Interested",
  invalid_contact: "Invalid",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  not_contacted: "bg-[#9CA3AF]",
  contacted: "bg-[#3B82F6]",
  follow_up_required: "bg-[#F59E0B]",
  appointment_booked: "bg-[#10B981]",
  closed: "bg-[#059669]",
  not_interested: "bg-[#EF4444]",
  invalid_contact: "bg-[#EF4444]",
};

// ============================================
// Avatar Colors
// ============================================

const AVATAR_COLORS = [
  "bg-[#EFF6FF] text-[#1A56DB]",
  "bg-[#ECFDF5] text-[#059669]",
  "bg-[#FFFBEB] text-[#D97706]",
  "bg-[#F5F3FF] text-[#7C3AED]",
  "bg-[#FDF2F8] text-[#DB2777]",
  "bg-[#ECFEFF] text-[#0891B2]",
];

// ============================================
// Props
// ============================================

interface LeadDetailsDrawerProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
  leads: Lead[];
  onNavigate: (leadId: string) => void;
}

// ============================================
// Quick Actions
// ============================================

function QuickActions({ lead }: { lead: LeadDetail }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback silently
    }
  };

  return (
    <div className="flex items-center gap-2">
      {lead.website && (
        <a
          href={lead.website}
          target="_blank"
          rel="noopener noreferrer"
          className="dl-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-[12px] font-medium text-white hover:brightness-110 transition-all duration-150"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Website
        </a>
      )}
      {lead.phone && (
        <a
          href={`tel:${lead.phone}`}
          className="dl-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all duration-150"
        >
          <Phone className="h-3.5 w-3.5" />
          Call
        </a>
      )}
      {lead.email && (
        <a
          href={`mailto:${lead.email}`}
          className="dl-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all duration-150"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </a>
      )}
      {(lead.email || lead.phone) && (
        <button
          type="button"
          onClick={() => {
            const text = [lead.email, lead.phone].filter(Boolean).join("\n");
            copyToClipboard(text, "contact");
          }}
          className="dl-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all duration-150"
        >
          {copied === "contact" ? (
            <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied === "contact" ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function DrawerSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      {/* Status section */}
      <div className="py-2 border-b border-[var(--border-subtle)]">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-8 w-full rounded-[var(--radius-md)]" />
      </div>
      {/* Company section */}
      <div className="py-2 border-b border-[var(--border-subtle)]">
        <Skeleton className="h-3 w-32 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <div className="flex-1">
                <Skeleton className="h-2.5 w-12 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Timeline section */}
      <div className="py-2 border-b border-[var(--border-subtle)]">
        <Skeleton className="h-3 w-16 mb-2" />
        <SkeletonText lines={3} />
      </div>
      {/* Notes section */}
      <div className="py-2">
        <Skeleton className="h-3 w-12 mb-2" />
        <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

// ============================================
// Main Drawer Component
// ============================================

export function LeadDetailsDrawer({
  leadId,
  open,
  onClose,
  leads,
  onNavigate,
}: LeadDetailsDrawerProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Derive loading from whether lead matches the current request
  const isLoading = open && leadId !== "" && (!lead || lead.id !== leadId);

  // Close handler (defined before effects that reference it)
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Find current index for prev/next
  const currentIndex = leads.findIndex((l) => l.id === leadId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < leads.length - 1;

  // Fetch lead details
  useEffect(() => {
    if (!open || !leadId) return;

    let cancelled = false;

    // Reset state for new lead
    setLead(null);
    setStatusHistory([]);

    fetchLeadDetailsAction(leadId).then((result) => {
      if (cancelled) return;
      if (result.lead) {
        setLead(result.lead);
        setStatusHistory(result.statusHistory);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus first element on open
  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [open, isLoading]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < leads.length) {
        onNavigate(leads[newIndex].id);
      }
    },
    [currentIndex, leads, onNavigate],
  );

  const handleStatusChange = useCallback(
    (newStatus: LeadStatus) => {
      setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
    },
    [],
  );

  if (!open && !closing) return null;

  // Avatar color based on company name
  const avatarColor = lead
    ? AVATAR_COLORS[lead.company_name.charCodeAt(0) % AVATAR_COLORS.length]
    : AVATAR_COLORS[0];

  return createPortal(
    <div
      ref={overlayRef}
      className={`lead-preview-overlay ${closing ? "drawer-closing" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Lead details: ${lead?.company_name || "Loading..."}`}
    >
      <div className="lead-preview-panel">
        {/* ─── Header (sticky) ─── */}
        <div className="shrink-0 px-5 pt-3 pb-3 border-b border-[var(--border-subtle)]">
          {/* Nav row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleNavigate("prev")}
                disabled={!hasPrev}
                className="dl-press p-1.5 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Previous lead"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] text-[var(--text-3)] tabular-nums min-w-[48px] text-center">
                {currentIndex >= 0 ? `${currentIndex + 1} of ${leads.length}` : ""}
              </span>
              <button
                type="button"
                onClick={() => handleNavigate("next")}
                disabled={!hasNext}
                className="dl-press p-1.5 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Next lead"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="dl-press p-1.5 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Company identity */}
          {isLoading && !lead ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
            </div>
          ) : lead ? (
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-[14px] font-semibold shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${avatarColor}`}
              >
                {lead.company_name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                {/* Company name — primary element */}
                <h2 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--text-1)] leading-tight truncate">
                  {lead.company_name}
                </h2>

                {/* Industry + Status — inline, no card badges */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {lead.industry && (
                    <Badge variant="info" className="text-[10px] px-2 py-0.5">
                      {lead.industry}
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-2)]">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[lead.status] || "bg-[#9CA3AF]"}`} />
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </div>

                {/* Assigned date */}
                {lead.assigned_at && (
                  <p className="text-[11px] text-[var(--text-3)] mt-1 tabular-nums">
                    Assigned {new Date(lead.assigned_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* ─── Body (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && !lead ? (
            <DrawerSkeleton />
          ) : lead ? (
            <div
              className="px-4 py-2 space-y-0"
              style={{ animation: "fadeIn 200ms ease-out" }}
            >
              <DrawerStatusSection lead={lead} onStatusChange={handleStatusChange} />
              <DrawerCompanySection lead={lead} />
              <DrawerTimelineSection lead={lead} statusHistory={statusHistory} />
              <DrawerNotesSection key={lead.id} leadId={lead.id} initialNotes={lead.internal_notes || ""} />
            </div>
          ) : null}
        </div>

        {/* ─── Footer (sticky) ─── */}
        {lead && (
          <div className="shrink-0 px-5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface)]">
            <QuickActions lead={lead} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
