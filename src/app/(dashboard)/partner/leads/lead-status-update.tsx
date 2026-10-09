"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { updateLeadStatusAction } from "@/app/(dashboard)/partner/actions";
import type { Lead } from "@/types/database";

// ============================================
// Status Constants
// ============================================

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_required", label: "Follow Up" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "closed", label: "Closed" },
  { value: "not_interested", label: "Not Interested" },
  { value: "invalid_contact", label: "Invalid Contact" },
] as const;

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_STYLES: Record<string, string> = {
  not_contacted: "bg-[var(--hover-bg)] text-[var(--text-2)] hover:bg-[var(--border-subtle)]",
  contacted: "bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent-light)]",
  follow_up_required: "bg-[var(--status-warning-bg)] text-[var(--status-warning)] hover:bg-[var(--status-warning-bg)]",
  appointment_booked: "bg-[var(--status-success-bg)] text-[var(--status-success)] hover:bg-[var(--status-success-bg)]",
  closed: "bg-[var(--status-success-bg)] text-[var(--status-success)] hover:bg-[var(--status-success-bg)]",
  not_interested: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]",
  invalid_contact: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]",
};

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
// StatusBadge Component
// ============================================

export function StatusBadge({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (newStatus === lead.status) return;
      setUpdating(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.set("leadId", lead.id);
        formData.set("status", newStatus);

        const result = await updateLeadStatusAction(null, formData);
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch {
        setError("Failed to update status");
      }

      setUpdating(false);
      setIsOpen(false);
    },
    [lead.id, lead.status, router],
  );

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

  const label = STATUS_LABELS[lead.status] || lead.status;
  const dotColor = STATUS_DOT_COLORS[lead.status] || "bg-[var(--text-3)]";
  const styles = STATUS_STYLES[lead.status] || STATUS_STYLES.not_contacted;

  // Compute popover position from trigger (same width as the trigger)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      width: rect.width,
      zIndex: 200,
    });
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          text-[11px] font-medium
          transition-all duration-150 ease-out
          hover:shadow-sm active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${styles}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        {label}
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="py-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-soft-md)] shadow-[var(--shadow-3)] dl-dropdown-enter"
          >
            {STATUS_OPTIONS.map((opt) => {
              const isActive = lead.status === opt.value;
              const optDot = STATUS_DOT_COLORS[opt.value] || "bg-[var(--text-3)]";
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={updating}
                  className={`
                    w-full flex items-center gap-2 px-3 min-h-[44px] py-2 text-[12px]
                    hover:bg-[var(--hover-bg)] transition-colors duration-150
                    ${isActive ? "font-medium text-[var(--text-1)]" : "text-[var(--text-2)]"}
                    disabled:opacity-50
                  `}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${optDot}`} />
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

      {error &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: triggerRef.current
                ? triggerRef.current.getBoundingClientRect().bottom + 4
                : 0,
              right: triggerRef.current
                ? window.innerWidth - triggerRef.current.getBoundingClientRect().right
                : 0,
              zIndex: 200,
            }}
            className="px-3 py-2 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-[11px] text-red-600 shadow-lg dl-dropdown-enter"
          >
            {error}
          </div>,
          document.body,
        )}
    </>
  );
}
