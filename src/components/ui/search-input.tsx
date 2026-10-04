"use client";

import { useState, useRef, forwardRef, useImperativeHandle, type KeyboardEvent } from "react";
import { Search, X, Command } from "lucide-react";

export interface SearchInputHandle {
  focus: () => void;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * SearchInput — Command palette-style search trigger.
 *
 * Design language: Full-width search with ⌘K hint when unfocused.
 * Transforms on focus with accent border color.
 * Shows clear button when there's text.
 *
 * Design tokens: --radius-md, --accent, --focus-ring, --type-body
 */
export const SearchInput = forwardRef<SearchInputHandle, SearchInputProps>(
  ({ value, onChange, onClear, onSubmit, placeholder = "Search...", className = "" }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
      className={`flex-1 relative ${className}`}
    >
      <div
        className={`
          relative flex items-center h-[40px] rounded-[var(--radius-md)]
          border transition-all duration-150
          ${focused
            ? "border-[var(--accent)] ring-[3px] ring-[var(--focus-ring)] bg-white"
            : "border-[var(--border)] bg-[var(--hover-bg)] hover:border-[#D1D5DB]"
          }
        `}
      >
        <Search className="absolute left-3.5 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-full pl-10 pr-10 bg-transparent dl-type-body text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none"
        />

        {value ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-1 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          !focused && (
            <div className="absolute right-3 hidden items-center gap-1 pointer-events-none [@media(hover:hover)]:flex">
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-[var(--border)] bg-[var(--canvas)] dl-type-micro">
                <Command className="h-2.5 w-2.5" />
              </kbd>
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-[var(--border)] bg-[var(--canvas)] dl-type-micro">
                K
              </kbd>
            </div>
          )
        )}
      </div>
    </form>
  );
});

SearchInput.displayName = "SearchInput";
