"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, Search, ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PartnerOption {
  id: string;
  label: string;
  sublabel?: string; // e.g. company_id
}

export interface MultiPartnerSelectProps {
  /** Available partner options. */
  partners: PartnerOption[];
  /** Currently selected partner IDs. */
  selected: string[];
  /** Callback when selection changes. */
  onChange: (ids: string[]) => void;
  /** Placeholder when nothing is selected. */
  placeholder?: string;
  /** Maximum number of selections. */
  maxSelections?: number;
  /** Disable the entire select. */
  disabled?: boolean;
  /** Additional class names for the trigger button. */
  className?: string;
}

// ---------------------------------------------------------------------------
// MultiPartnerSelect
// ---------------------------------------------------------------------------

/**
 * Searchable multi-select with removable chips.
 * Reusable outside Smart Assignment — no domain-specific imports.
 */
export function MultiPartnerSelect({
  partners,
  selected,
  onChange,
  placeholder = "Select partners...",
  maxSelections,
  disabled = false,
  className = "",
}: MultiPartnerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter partners by search term
  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.label.toLowerCase().includes(q) ||
      (p.sublabel && p.sublabel.toLowerCase().includes(q))
    );
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    },
    [],
  );

  const togglePartner = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (maxSelections && selected.length >= maxSelections) return;
      onChange([...selected, id]);
    }
  };

  const removePartner = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== id));
  };

  const selectedPartners = partners.filter((p) => selected.includes(p.id));

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Chips */}
      {selectedPartners.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selectedPartners.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-light)] border border-[var(--accent)]/20 text-[12px] font-medium text-[var(--accent)]"
            >
              <Check className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{p.label}</span>
              <button
                type="button"
                onClick={(e) => removePartner(p.id, e)}
                className="ml-0.5 rounded-full hover:bg-[var(--accent)]/20 p-0.5 transition-colors"
                aria-label={`Remove ${p.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`
          flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-sm)] border text-left text-[13px]
          transition-all duration-150
          ${
            disabled
              ? "bg-[var(--canvas)] border-[var(--border)] text-[var(--text-3)] cursor-not-allowed"
              : open
                ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/20 bg-white"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[#D1D5DB]"
          }
        `}
      >
        <span className="flex-1 truncate text-[var(--text-1)]">
          {selected.length === 0 ? (
            <span className="text-[var(--text-3)]">{placeholder}</span>
          ) : (
            `${selected.length} partner${selected.length !== 1 ? "s" : ""} selected`
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--text-3)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-[var(--border)] rounded-[var(--radius-sm)] shadow-[var(--shadow-3)] overflow-hidden"
          style={{ animation: "dropdownEnter 150ms ease-out" }}
        >
          {/* Search */}
          <div className="px-2 py-1.5 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search partners..."
                className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-[var(--canvas)] border border-[var(--border)] rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-[var(--text-3)]">
                No partners found
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePartner(p.id)}
                    className={`
                      flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors
                      ${isSelected ? "bg-[var(--accent-light)]" : "hover:bg-[var(--hover-bg)]"}
                    `}
                  >
                    <div
                      className={`
                        flex h-4 w-4 items-center justify-center rounded border
                        ${
                          isSelected
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--border)] bg-white"
                        }
                      `}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-1)] truncate">
                        {p.label}
                      </p>
                      {p.sublabel && (
                        <p className="text-[10px] text-[var(--text-3)] truncate">
                          {p.sublabel}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
