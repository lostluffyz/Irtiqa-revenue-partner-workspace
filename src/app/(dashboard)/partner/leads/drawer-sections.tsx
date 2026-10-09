"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Globe,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  Check,
  CalendarCheck,
  X,
  AlertTriangle,
  Copy,
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
  { value: "not_contacted", label: "Not Contacted", dot: "bg-[var(--text-3)]" },
  { value: "contacted", label: "Contacted", dot: "bg-[var(--accent)]" },
  { value: "follow_up_required", label: "Follow Up Required", dot: "bg-[var(--status-warning)]" },
  { value: "appointment_booked", label: "Appointment Booked", dot: "bg-[var(--status-success)]", icon: "calendar" },
  { value: "closed", label: "Closed", dot: "bg-[var(--status-success)]", icon: "check" },
  { value: "not_interested", label: "Not Interested", dot: "bg-[var(--status-danger)]", icon: "x" },
  { value: "invalid_contact", label: "Invalid Contact", dot: "bg-[var(--status-danger)]", icon: "alert" },
] as const;

const STATUS_DOT_COLORS: Record<string, string> = {
  not_contacted: "bg-[var(--text-3)]",
  contacted: "bg-[var(--accent)]",
  follow_up_required: "bg-[var(--status-warning)]",
  appointment_booked: "bg-[var(--status-success)]",
  closed: "bg-[var(--status-success)]",
  not_interested: "bg-[var(--status-danger)]",
  invalid_contact: "bg-[var(--status-danger)]",
};

// ============================================
// Helpers
// ============================================

import { formatWebsiteHostname } from "@/components/dashboard/helpers";

function CopyMiniButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // fallback silently
        }
      }}
      title={copied ? "Copied!" : `Copy ${label}`}
      aria-label={copied ? "Copied!" : `Copy ${label}`}
      className="shrink-0 rounded-[var(--radius-soft-xs)] p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
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

function OptionGlyph({ option }: { option: (typeof STATUS_OPTIONS)[number] }) {
  const iconClass = "h-3.5 w-3.5 shrink-0";
  if (!("icon" in option) || !option.icon) {
    return <span className={`w-2 h-2 rounded-full shrink-0 ${option.dot}`} />;
  }
  if (option.icon === "calendar") return <CalendarCheck className={`${iconClass} text-[var(--status-success)]`} />;
  if (option.icon === "check") return <Check className={`${iconClass} text-[var(--status-success)]`} />;
  if (option.icon === "x") return <X className={`${iconClass} text-[var(--status-danger)]`} />;
  return <AlertTriangle className={`${iconClass} text-[var(--status-danger)]`} />;
}

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
  const currentDot = STATUS_DOT_COLORS[currentStatus] || "bg-[var(--text-3)]";

  // Compute popover position from trigger (same width as the trigger)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 200,
    });
  }, [isOpen]);

  return (
    <div className="py-2 border-b border-[var(--border-subtle)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-2">
        Status
      </h3>

      {/* White bordered trigger — never looks disabled */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`
          w-full flex items-center gap-2 px-3 py-2 min-h-[44px] md:min-h-0
          rounded-[var(--radius-soft-md)] border border-[var(--border)] bg-[var(--surface)]
          text-[12px] font-medium text-[var(--text-1)]
          transition-all duration-150
          hover:border-[var(--accent)] hover:shadow-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${currentDot}`} />
        <span className="flex-1 text-left truncate">{currentLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
      </button>

      {/* Popover — same width as the trigger */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="py-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-soft-md)] shadow-[var(--shadow-3)] dl-dropdown-enter"
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
                    w-full flex items-center gap-2 px-3 min-h-[44px] py-2 text-[12px]
                    hover:bg-[var(--hover-bg)] transition-colors duration-150
                    ${isActive ? "font-medium text-[var(--text-1)] bg-[var(--hover-bg)]" : "text-[var(--text-2)]"}
                  `}
                >
                  <OptionGlyph option={opt} />
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
  copyText,
  copyLabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  href?: string;
  copyText?: string;
  copyLabel?: string;
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
              {label === "Website" ? formatWebsiteHostname(value) : value}
            </a>
          ) : (
            <p className="text-[13px] text-[var(--text-1)] truncate">{value}</p>
          )
        ) : (
          <p className="text-[12px] text-[var(--text-3)]">Not provided</p>
        )}
      </div>
      {copyText && <CopyMiniButton text={copyText} label={copyLabel || label} />}
    </div>
  );
}

export function DrawerCompanySection({ lead }: SectionBaseProps) {
  return (
    <div className="py-2 border-b border-[var(--border-subtle)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)] mb-1">
        Company Information
      </h3>
      <div className="rounded-[var(--radius-soft-md)] border border-[var(--border-subtle)] bg-[var(--canvas)]/60 px-3 py-1">
        <div className="divide-y divide-[var(--border-subtle)]">
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
            copyText={lead.email || undefined}
            copyLabel="email"
          />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={lead.phone}
            href={lead.phone ? `tel:${lead.phone}` : undefined}
            copyText={lead.phone || undefined}
            copyLabel="phone"
          />
          <InfoRow
            icon={MapPin}
            label="Country"
            value={lead.country}
          />
        </div>
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
