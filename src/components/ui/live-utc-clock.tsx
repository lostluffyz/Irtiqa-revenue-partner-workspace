"use client";

import { useSyncExternalStore } from "react";

/* ═══════════════════════════════════════════════════════════════
   Live UTC Clock
   ═══════════════════════════════════════════════════════════════

   A lightweight real-time clock that displays the current time
   in UTC (or any specified timezone). Updates every second.

   Used in:
   - Admin shell (top-right corner)
   - Partner shell (top-right corner)
   - Partner detail page (timezone section)

   Uses useSyncExternalStore for optimal performance — no
   unnecessary re-renders, no setState in effects.
   ═══════════════════════════════════════════════════════════════ */

interface LiveClockProps {
  /** IANA timezone identifier (default: "UTC") */
  timezone?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show the timezone label (e.g., "UTC", "IST") */
  showLabel?: boolean;
}

// Pre-create UTC formatters outside component for performance
const UTC_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});

// ── Clock Store ──────────────────────────────────────────────
// A simple external store that ticks every second.
// All LiveClock instances share the same interval.

let listeners: Array<() => void> = [];
let currentTime = new Date();

function emitChange() {
  currentTime = new Date();
  for (const listener of listeners) {
    listener();
  }
}

// Start a single interval when the module loads (client-side only)
if (typeof window !== "undefined") {
  setInterval(emitChange, 1000);
}

function subscribeClock(callback: () => void) {
  listeners = [...listeners, callback];
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getClockSnapshot() {
  return currentTime;
}

// Server snapshot: returns a stable Date for SSR.
// After hydration, useSyncExternalStore switches to getClockSnapshot
// which returns the ticking live time.
function getServerClockSnapshot() {
  return new Date();
}

// ── Formatting ───────────────────────────────────────────────

function formatTime(timezone: string, date: Date): string {
  if (timezone === "UTC") return UTC_TIME_FORMATTER.format(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(timezone: string, date: Date): string {
  if (timezone === "UTC") return UTC_DATE_FORMATTER.format(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

// ── Components ───────────────────────────────────────────────

/**
 * Live UTC Clock — real-time clock updating every second.
 *
 * Renders a time display with an optional date line and timezone label.
 * Uses useSyncExternalStore for optimal rendering performance.
 *
 * @example
 * <LiveClock timezone="UTC" showLabel />
 * // Renders:
 * // 18:38:42 UTC
 * // Sunday, August 2
 */
export function LiveClock({
  timezone = "UTC",
  className,
  showLabel = false,
}: LiveClockProps) {
  const currentTime = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);

  const time = formatTime(timezone, currentTime);
  const date = formatDate(timezone, currentTime);
  const label = timezone === "UTC" ? "UTC" : undefined;

  return (
    <div className={className}>
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className="text-[13px] font-medium text-[var(--text-1)]">
          {time}
        </span>
        {showLabel && label && (
          <span className="text-[11px] text-[var(--text-3)]">{label}</span>
        )}
      </div>
      <p className="text-[11px] text-[var(--text-3)] tabular-nums">
        {date}
      </p>
    </div>
  );
}

/**
 * Compact Live UTC Clock — single-line time display.
 *
 * Smaller variant for inline use (e.g., in card headers, table cells).
 *
 * @example
 * <LiveClockCompact timezone="Asia/Kolkata" />
 * // Renders: "02:38:42"
 */
export function LiveClockCompact({
  timezone = "UTC",
  className,
}: LiveClockProps) {
  const currentTime = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
  const time = formatTime(timezone, currentTime);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {time}
    </span>
  );
}
