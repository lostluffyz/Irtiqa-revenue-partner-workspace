"use client";

import { useEffect, useRef, useCallback, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface CommandMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  active?: boolean;
  disabled?: boolean;
}

interface CommandMenuSection {
  id: string;
  label?: string;
  items: CommandMenuItem[];
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  header?: ReactNode;
  sections: CommandMenuSection[];
  className?: string;
}

/**
 * CommandMenu — Floating action palette with sections and keyboard navigation.
 *
 * Design language: Raycast/Linear-inspired command palette.
 * Features: sections with dividers, keyboard hints, icons, descriptions,
 * arrow key navigation, Enter to select, Escape to close.
 *
 * Design tokens: --radius-md, --shadow-3, --type-body, --type-caption, --type-micro
 * Animation: dl-dropdown-enter (150ms spring)
 */
export function CommandMenu({
  open,
  onClose,
  onSelect,
  header,
  sections,
  className = "",
}: CommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Flatten all enabled items for keyboard navigation
  const allItems = sections.flatMap((s) => s.items.filter((i) => !i.disabled));

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % allItems.length);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[activeIndex];
        if (item && !item.disabled) {
          onSelect(item.id);
        }
      }
    },
    [open, activeIndex, allItems, onClose, onSelect]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset active index when sections change
  useEffect(() => {
    setActiveIndex(0);
  }, [sections]);

  // Scroll active item into view
  useEffect(() => {
    const item = itemRefs.current[activeIndex];
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className={`
          absolute dl-surface dl-elevate-3 overflow-hidden dl-dropdown-enter
          min-w-[280px] max-w-[340px]
          ${className}
        `}
        style={{ top: "var(--menu-top, 50%)", left: "var(--menu-left, 50%)" }}
      >
        {/* Header */}
        {header && (
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            {header}
          </div>
        )}

        {/* Sections */}
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter((i) => !i.disabled);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.id}>
              {/* Divider between sections */}
              {sIdx > 0 && (
                <div className="h-px bg-[var(--border-subtle)] mx-2" />
              )}

              {/* Section label */}
              {section.label && (
                <div className="px-3 pt-2.5 pb-1">
                  <span className="dl-type-micro">{section.label}</span>
                </div>
              )}

              {/* Items */}
              <div className="py-0.5 px-1.5">
                {section.items.map((item) => {
                  if (item.disabled) return null;
                  const currentIndex = flatIndex;
                  flatIndex++;
                  const isActive = currentIndex === activeIndex;

                  return (
                    <button
                      key={item.id}
                      ref={(el) => { itemRefs.current[currentIndex] = el; }}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`
                        w-full flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-sm)]
                        transition-colors duration-100 text-left
                        ${item.destructive
                          ? "text-[var(--status-danger)]"
                          : isActive
                            ? "bg-[var(--hover-bg)] text-[var(--text-1)]"
                            : "text-[var(--text-2)]"
                        }
                      `}
                    >
                      {/* Icon */}
                      {item.icon && (
                        <span className={`
                          flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] shrink-0
                          ${item.destructive
                            ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                            : "bg-[var(--canvas)] text-[var(--text-3)]"
                          }
                        `}>
                          {item.icon}
                        </span>
                      )}

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="dl-type-body truncate">{item.label}</p>
                        {item.description && (
                          <p className="dl-type-caption text-[var(--text-3)] mt-0.5 truncate">{item.description}</p>
                        )}
                      </div>

                      {/* Shortcut hint */}
                      {item.shortcut && (
                        <kbd className="inline-flex items-center h-5 px-1.5 rounded border border-[var(--border)] bg-[var(--canvas)] dl-type-micro shrink-0">
                          {item.shortcut}
                        </kbd>
                      )}

                      {/* Active indicator */}
                      {item.active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * CommandMenuHeader — Standard header for CommandMenu.
 * Shows entity info (avatar, name, metadata).
 */
export function CommandMenuHeader({
  avatar,
  name,
  subtitle,
  onClose,
}: {
  avatar?: ReactNode;
  name: string;
  subtitle?: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="dl-type-body font-medium text-[var(--text-1)] truncate">{name}</p>
        {subtitle && (
          <p className="dl-type-caption text-[var(--text-3)] truncate">{subtitle}</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
