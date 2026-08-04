"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

interface PopoverOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface PopoverProps {
  trigger: ReactNode;
  options: PopoverOption[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Popover — Floating dropdown panel with optional search.
 *
 * Opens below trigger, closes on outside click or Escape.
 * When searchable, shows a search input at top with auto-focus.
 * Uses dl-dropdown-enter animation for smooth appearance.
 *
 * Design tokens: --radius-md, --shadow-3, --type-body, --type-caption
 */
export function Popover({
  trigger,
  options,
  value,
  onChange,
  searchable = false,
  placeholder = "Search...",
  className = "",
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  const filtered = options.filter((o) =>
    search ? o.label.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 dl-surface dl-elevate-3 z-50 overflow-hidden dl-dropdown-enter">
          {searchable && (
            <div className="p-2 border-b border-[var(--border-subtle)]">
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-[32px] pl-8 pr-3 rounded-[var(--radius-sm)] bg-[var(--canvas)] border-0 dl-type-body text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
            </div>
          )}

          <div className="py-1 max-h-56 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 dl-type-body
                  transition-colors duration-100
                  ${value === opt.value
                    ? "bg-[var(--accent-light)] text-[var(--accent)]"
                    : "text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)]"
                  }
                `}
              >
                <span className="w-4 flex items-center justify-center shrink-0">
                  {value === opt.value && <Check className="h-3.5 w-3.5" />}
                </span>
                {opt.icon && <span className="shrink-0 opacity-60">{opt.icon}</span>}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 dl-type-body text-[var(--text-3)] text-center">
                No results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PopoverTrigger — Standard trigger button for Popover.
 * Renders a button with the trigger label and a chevron.
 */
export function PopoverTrigger({
  label,
  active = false,
  icon,
  className = "",
}: {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`
        inline-flex items-center gap-1.5 h-[32px] px-3 rounded-[var(--radius-sm)]
        dl-type-caption dl-focus-ring
        transition-all duration-150
        ${active
          ? "border border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[#D1D5DB] hover:bg-[var(--hover-bg)]"
        }
        ${className}
      `}
    >
      {icon && <span className="shrink-0 opacity-60">{icon}</span>}
      <span className="truncate max-w-[100px]">{label}</span>
      <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
    </button>
  );
}
