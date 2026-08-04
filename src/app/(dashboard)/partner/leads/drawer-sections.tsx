"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Globe,
  Mail,
  Phone,
  Building2,
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateLeadStatusAction } from "../actions";
import { LeadTimeline } from "./lead-timeline";
import { LeadNotes } from "./lead-notes";
import type { LeadDetail, StatusHistoryEntry } from "../actions";
import type { LeadStatus } from "@/types/database";

// ============================================
// Status Constants
// ============================================

const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  follow_up_required: "Follow Up",
  appointment_booked: "Appointment Booked",
  closed: "Closed",
  not_interested: "Not Interested",
  invalid_contact: "Invalid",
};

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted", dot: "bg-[#9CA3AF]" },
  { value: "contacted", label: "Contacted", dot: "bg-[#3B82F6]" },
  { value: "follow_up_required", label: "Follow Up Required", dot: "bg-[#F59E0B]" },
  { value: "appointment_booked", label: "Appointment Booked", dot: "bg-[#10B981]" },
  { value: "closed", label: "Closed", dot: "bg-[#059669]" },
  { value: "not_interested", label: "Not Interested", dot: "bg-[#EF4444]" },
  { value: "invalid_contact", label: "Invalid Contact", dot: "bg-[#EF4444]" },
];

const STATUS_STYLES: Record<string, string> = {
  not_contacted: "bg-[#F3F4F6] text-[#6B7280]",
  contacted: "bg-[#EFF6FF] text-[#1A56DB]",
  follow_up_required: "bg-[#FFFBEB] text-[#D97706]",
  appointment_booked: "bg-[#ECFDF5] text-[#059669]",
  closed: "bg-[#D1FAE5] text-[#047857]",
  not_interested: "bg-[#FEF2F2] text-[#DC2626]",
  invalid_contact: "bg-[#FEF2F2] text-[#DC2626]",
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
// Helpers
// ============================================

function getDisplayDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ============================================
// Section Props
// ============================================

interface SectionBaseProps {
  lead: LeadDetail;
}

interface StatusSectionProps extends SectionBaseProps {
  onStatusChange: (newStatus: LeadStatus) => void;
}

interface NotesSectionProps {
  leadId: string;
  initialNotes: string;
}

// ============================================
// Status Section — Simplified, Not Form-like
// ============================================

export function DrawerStatusSection({ lead, onStatusChange }: StatusSectionProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(lead.status);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(async () => {
    if (currentStatus === lead.status) return;

    setUpdating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("leadId", lead.id);
      formData.set("status", currentStatus);

      const result = await updateLeadStatusAction(null, formData);
      if (result.error) {
        setError(result.error);
        setCurrentStatus(lead.status);
      } else {
        onStatusChange(currentStatus);
        router.refresh();
      }
    } catch {
      setError("Failed to update status");
      setCurrentStatus(lead.status);
    }

    setUpdating(false);
  }, [currentStatus, lead.id, lead.status, onStatusChange, router]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const hasChanges = currentStatus !== lead.status;
  const currentLabel = STATUS_LABELS[currentStatus] || currentStatus;
  const currentDot = STATUS_DOT_COLORS[currentStatus] || "bg-[#9CA3AF]";
  const currentStyle = STATUS_STYLES[currentStatus] || STATUS_STYLES.not_contacted;

  // Compute popover position
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 200,
    });
  }, [isOpen]);

  return (
    <div className="py-2 border-b border-[var(--border-subtle)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-2">
        Status
      </h3>

      {/* Single select trigger — no badge + arrow form pattern */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`
          w-full flex items-center gap-2 px-3 py-2
          rounded-[var(--radius-md)] border border-[var(--border)]
          text-[12px] font-medium
          transition-all duration-150
          hover:border-[var(--accent)] hover:shadow-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          ${currentStyle}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${currentDot}`} />
        <span className="flex-1 text-left truncate">{currentLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
      </button>

      {/* Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="w-52 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-3)] dl-dropdown-enter"
          >
            {STATUS_OPTIONS.map((opt) => {
              const isActive = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setCurrentStatus(opt.value as LeadStatus);
                    setIsOpen(false);
                    setError(null);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-[12px]
                    hover:bg-[var(--hover-bg)] transition-colors duration-150
                    ${isActive ? "font-medium text-[var(--text-1)] bg-[var(--hover-bg)]" : "text-[var(--text-2)]"}
                  `}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                  {opt.label}
                  {isActive && (
                    <Check className="h-3 w-3 ml-auto text-[var(--accent)]" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {error && (
        <p className="mt-1.5 text-[11px] text-[var(--status-danger)]">{error}</p>
      )}
      {hasChanges && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="primary"
            size="sm"
            loading={updating}
            onClick={handleSave}
          >
            Save Status
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Company Information Section
// ============================================

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-[var(--text-3)] mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-[var(--text-2)] uppercase tracking-[0.05em] mb-px">
          {label}
        </p>
        {value ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[var(--accent)] hover:underline underline-offset-2 decoration-[var(--accent)]/30 hover:decoration-[var(--accent)] transition-colors duration-150 truncate block"
            >
              {label === "Website" ? getDisplayDomain(value) : value}
            </a>
          ) : (
            <p className="text-[13px] text-[var(--text-1)] truncate">{value}</p>
          )
        ) : (
          <p className="text-[12px] text-[var(--text-3)] italic opacity-60">Not provided</p>
        )}
      </div>
    </div>
  );
}

export function DrawerCompanySection({ lead }: SectionBaseProps) {
  return (
    <div className="py-2 border-b border-[var(--border-subtle)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-1">
        Company Information
      </h3>
      <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
        <InfoRow
          icon={Building2}
          label="Company"
          value={lead.company_name}
        />
        <InfoRow
          icon={Globe}
          label="Website"
          value={lead.website}
          href={lead.website || undefined}
        />
        <InfoRow
          icon={Mail}
          label="Email"
          value={lead.email}
          href={lead.email ? `mailto:${lead.email}` : undefined}
        />
        <InfoRow
          icon={Phone}
          label="Phone"
          value={lead.phone}
          href={lead.phone ? `tel:${lead.phone}` : undefined}
        />
        <InfoRow
          icon={MapPin}
          label="Country"
          value={lead.country}
        />
      </div>
    </div>
  );
}

// ============================================
// Timeline Section
// ============================================

export function DrawerTimelineSection({
  lead,
  statusHistory,
}: SectionBaseProps & { statusHistory: StatusHistoryEntry[] }) {
  return (
    <div className="py-2 border-b border-[var(--border-subtle)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-2">
        Activity
      </h3>
      <LeadTimeline
        assignedAt={lead.assigned_at}
        statusHistory={statusHistory}
      />
    </div>
  );
}

// ============================================
// Notes Section
// ============================================

export function DrawerNotesSection({ leadId, initialNotes }: NotesSectionProps) {
  return (
    <div className="py-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-2">
        Notes
      </h3>
      <LeadNotes leadId={leadId} initialNotes={initialNotes || ""} />
    </div>
  );
}
