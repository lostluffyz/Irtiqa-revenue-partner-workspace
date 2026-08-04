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
  not_contacted: "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]",
  contacted: "bg-[#EFF6FF] text-[#1A56DB] hover:bg-[#DBEAFE]",
  follow_up_required: "bg-[#FFFBEB] text-[#D97706] hover:bg-[#FEF3C7]",
  appointment_booked: "bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]",
  closed: "bg-[#D1FAE5] text-[#047857] hover:bg-[#A7F3D0]",
  not_interested: "bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]",
  invalid_contact: "bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]",
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
  const dotColor = STATUS_DOT_COLORS[lead.status] || "bg-[#9CA3AF]";
  const styles = STATUS_STYLES[lead.status] || STATUS_STYLES.not_contacted;

  // Compute popover position from trigger
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
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
            className="w-48 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-3)] dl-dropdown-enter"
          >
            {STATUS_OPTIONS.map((opt) => {
              const isActive = lead.status === opt.value;
              const optDot = STATUS_DOT_COLORS[opt.value] || "bg-[#9CA3AF]";
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={updating}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-[12px]
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
