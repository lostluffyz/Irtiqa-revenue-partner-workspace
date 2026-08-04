// ============================================
// Program Configuration
// ============================================

/** Single source of truth for program duration. All derived values use this. */
export const PROGRAM_DURATION_DAYS = 30;

// ============================================
// Program Timezone Configuration
// ============================================
//
// All business-date logic (program day, daily report date, streak)
// uses the configured PROGRAM_TIMEZONE. This ensures consistency
// regardless of server location or browser locale.
//
// The MVP default is Asia/Kolkata.
//
// ============================================

/**
 * Get the configured program timezone.
 * Reads from PROGRAM_TIMEZONE env var, falls back to default.
 */
export function getProgramTimezone(): string {
  return process.env.PROGRAM_TIMEZONE || "Asia/Kolkata";
}

/**
 * Get the current business date (YYYY-MM-DD) in the program timezone.
 *
 * Example: If it's 11 PM UTC (which is 4:30 AM next day IST),
 * the business date in Asia/Kolkata is the *next* day.
 *
 * @param tz - Timezone (defaults to PROGRAM_TIMEZONE)
 * @returns YYYY-MM-DD date string
 */
export function getBusinessDate(tz?: string): string {
  const timezone = tz || getProgramTimezone();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Calculate the program day for a partner.
 * Day 1 is the program_start_date.
 *
 * The calculation uses the business date (PROGRAM_TIMEZONE), NOT
 * UTC or server local time. This ensures consistency across
 * deployments in different regions.
 *
 * @param programStartDate - ISO date string (YYYY-MM-DD)
 * @param tz - Business timezone (defaults to PROGRAM_TIMEZONE)
 * @returns The current program day (1-indexed, capped at PROGRAM_DURATION_DAYS)
 */
export function getProgramDay(programStartDate: string, tz?: string): number {
  const timezone = tz || getProgramTimezone();
  const todayStr = getBusinessDate(timezone);

  // Parse both as UTC midnight for clean date-only comparison
  const start = new Date(programStartDate + "T00:00:00Z");
  const today = new Date(todayStr + "T00:00:00Z");

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // If program hasn't started yet, return negative or 0 days-until-start
  // We'll expose a clear status below
  if (diffDays < 0) {
    return diffDays; // caller can check for < 1
  }

  return Math.min(diffDays + 1, PROGRAM_DURATION_DAYS);
}

/**
 * Result of evaluating a partner's program status.
 */
export type ProgramStatus = {
  /** 'pre' = not yet started, 'active' = in progress, 'post' = completed */
  phase: "pre" | "active" | "post";
  /** Current program day (1–PROGRAM_DURATION_DAYS in active phase; 0 if pre, PROGRAM_DURATION_DAYS if post) */
  programDay: number;
  /** Days until program starts (positive) or 0 if started */
  daysUntilStart: number;
  /** Days remaining in the program */
  daysRemaining: number;
};

/**
 * Get the full program status for a partner.
 * Provides structured information for rendering the correct UI state.
 *
 * @param programStartDate - ISO date string (YYYY-MM-DD)
 * @param tz - Business timezone (defaults to PROGRAM_TIMEZONE)
 */
export function getProgramStatus(programStartDate: string, tz?: string): ProgramStatus {
  const timezone = tz || getProgramTimezone();
  const todayStr = getBusinessDate(timezone);

  const start = new Date(programStartDate + "T00:00:00Z");
  const today = new Date(todayStr + "T00:00:00Z");

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Program hasn't started yet
    return {
      phase: "pre",
      programDay: 0,
      daysUntilStart: Math.abs(diffDays),
      daysRemaining: PROGRAM_DURATION_DAYS + diffDays, // diffDays negative, so duration + (negative) = fewer
    };
  }

  const programDay = Math.min(diffDays + 1, PROGRAM_DURATION_DAYS);

  if (programDay >= PROGRAM_DURATION_DAYS) {
    return {
      phase: "post",
      programDay: PROGRAM_DURATION_DAYS,
      daysUntilStart: 0,
      daysRemaining: 0,
    };
  }

  return {
    phase: "active",
    programDay,
    daysUntilStart: 0,
    daysRemaining: PROGRAM_DURATION_DAYS - programDay,
  };
}

/**
 * Check if today's business date falls within the program duration.
 *
 * @param programStartDate - ISO date string (YYYY-MM-DD)
 * @param tz - Business timezone (defaults to PROGRAM_TIMEZONE)
 * @returns true if the business date is on or after program start
 */
export function isProgramActive(programStartDate: string, tz?: string): boolean {
  return getProgramDay(programStartDate, tz) >= 1;
}

/**
 * Format a date string in the business timezone for display.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param tz - Business timezone (defaults to PROGRAM_TIMEZONE)
 * @returns Formatted date string (e.g., "Jul 14, 2026")
 */
export function formatBusinessDate(dateStr: string, tz?: string): string {
  const timezone = tz || getProgramTimezone();
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================
// Deadline & Duration Formatting
// ============================================

/**
 * Format a deadline time for display.
 * e.g., formatDeadlineTime(18, 0) → "6:00 PM"
 * e.g., formatDeadlineTime(9, 30) → "9:30 AM"
 *
 * @param hour - Hour in 24h format (0-23)
 * @param minute - Minute (0-59)
 * @returns Formatted time string (e.g., "6:00 PM")
 */
export function formatDeadlineTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return minute === 0
    ? `${displayHour}:00 ${period}`
    : `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Format a duration in minutes as a human-readable string.
 * e.g., formatDuration(135) → "2h 15m"
 * e.g., formatDuration(45) → "45m"
 * e.g., formatDuration(0) → "just now"
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "just now";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ============================================
// Region → IANA Timezone Mapping
// ============================================
//
// TEMPORARY FALLBACK — will be superseded by a dedicated
// `timezone` column on the partners table.
//
// IANA names auto-handle DST — no fixed UTC offsets.
// To add a new region, add one entry below.

export const REGION_TIMEZONE_MAP: Record<string, string> = {
  "India": "Asia/Kolkata",
  "North America": "America/New_York",
  "Europe": "Europe/London",
  "Asia Pacific": "Asia/Singapore",
  "Middle East": "Asia/Dubai",
  "Africa": "Africa/Johannesburg",
  "Latin America": "America/Sao_Paulo",
  "Southeast Asia": "Asia/Bangkok",
  "East Asia": "Asia/Tokyo",
  "Central Asia": "Asia/Almaty",
};

/**
 * Resolve a partner's IANA timezone.
 *
 * Resolution order:
 *   1. partner.timezone (future — per-partner override, not yet in DB)
 *   2. REGION_TIMEZONE_MAP[regionName] (region-level default)
 *   3. PROGRAM_TIMEZONE env var (global fallback)
 *
 * To add per-partner timezone later, add a `timezone` column to the
 * partners table and pass it as the first argument. No other code changes needed.
 */
export function getPartnerTimezone(
  regionName: string | null,
  partnerTimezone?: string | null,
): string {
  if (partnerTimezone) return partnerTimezone;
  if (regionName) return REGION_TIMEZONE_MAP[regionName] ?? getProgramTimezone();
  return getProgramTimezone();
}

// ============================================
// Dual Timezone Formatting Utilities
// ============================================

/**
 * Get a short timezone label from an IANA timezone string.
 * "Asia/Kolkata" → "IST", "America/New_York" → "EDT"/"EST"
 *
 * Uses a manual mapping for common zones (Node.js V8 returns offset-based
 * names like "GMT+5:30" instead of abbreviations like "IST" for many zones).
 * Falls back to Intl.DateTimeFormat for unmapped zones.
 */
const TIMEZONE_LABELS: Record<string, { standard: string; daylight: string }> = {
  "Asia/Kolkata": { standard: "IST", daylight: "IST" },
  "Asia/Singapore": { standard: "SGT", daylight: "SGT" },
  "Asia/Tokyo": { standard: "JST", daylight: "JST" },
  "Asia/Dubai": { standard: "GST", daylight: "GST" },
  "Asia/Bangkok": { standard: "ICT", daylight: "ICT" },
  "Asia/Almaty": { standard: "QYZT", daylight: "QYZT" },
  "America/New_York": { standard: "EST", daylight: "EDT" },
  "America/Los_Angeles": { standard: "PST", daylight: "PDT" },
  "America/Chicago": { standard: "CST", daylight: "CDT" },
  "America/Sao_Paulo": { standard: "BRT", daylight: "BRST" },
  "Europe/London": { standard: "GMT", daylight: "BST" },
  "Europe/Paris": { standard: "CET", daylight: "CEST" },
  "Europe/Berlin": { standard: "CET", daylight: "CEST" },
  "Africa/Johannesburg": { standard: "SAST", daylight: "SAST" },
  "UTC": { standard: "UTC", daylight: "UTC" },
};

export function getTimezoneLabel(timezone: string): string {
  const mapped = TIMEZONE_LABELS[timezone];
  if (mapped) {
    // Determine if DST is active by checking if the offset differs from standard
    const now = new Date();
    const janOffset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date(now.getFullYear(), 0, 1));
    const julOffset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date(now.getFullYear(), 6, 1));
    const janVal = janOffset.find((p) => p.type === "timeZoneName")?.value ?? "";
    const julVal = julOffset.find((p) => p.type === "timeZoneName")?.value ?? "";

    // If offsets differ, the zone observes DST; check which half of year we're in
    if (janVal !== julVal) {
      const currentOffset = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "longOffset",
      }).formatToParts(now);
      const currentVal = currentOffset.find((p) => p.type === "timeZoneName")?.value ?? "";
      // If current offset matches January's offset, use standard; otherwise daylight
      return currentVal === janVal ? mapped.standard : mapped.daylight;
    }
    return mapped.standard;
  }

  // Fallback: use Intl (may return offset-based names like "GMT+5:30")
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(new Date());
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  return tzPart?.value ?? timezone;
}

/**
 * Get the current UTC offset string for a timezone.
 * "Asia/Kolkata" → "+05:30", "America/New_York" → "-04:00" (EDT) or "-05:00" (EST)
 *
 * Uses Intl.DateTimeFormat — DST-aware automatically.
 */
export function getUTCOffset(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).formatToParts(now);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  // longOffset returns e.g. "GMT+05:30" or "UTC-04:00" — normalize to "+05:30"
  const raw = offsetPart?.value ?? "";
  const cleaned = raw.replace("GMT", "").replace("UTC", "").trim();
  // Ensure it starts with + or -
  if (cleaned.startsWith("+") || cleaned.startsWith("-")) return cleaned;
  return "+00:00";
}

/**
 * Format a date in UTC.
 * Returns: "6:00 PM"
 */
export function formatUTC(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date in a partner's local timezone.
 * Returns: "11:30 AM"
 */
export function formatPartnerTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Convert a UTC deadline hour:minute to partner-local time string.
 * Creates a UTC Date at the deadline hour, then formats in partner timezone.
 * Handles DST correctly since it uses the actual Date + Intl formatting.
 *
 * @param utcHour - Deadline hour in UTC (0-23)
 * @param utcMinute - Deadline minute (0-59)
 * @param partnerTz - Partner's IANA timezone
 * @returns Formatted time string (e.g., "11:30 PM")
 */
export function formatDeadlineInTimezone(
  utcHour: number,
  utcMinute: number,
  partnerTz: string,
): string {
  const today = getBusinessDate("UTC");
  const utcDeadline = new Date(
    `${today}T${String(utcHour).padStart(2, "0")}:${String(utcMinute).padStart(2, "0")}:00Z`,
  );
  return utcDeadline.toLocaleTimeString("en-US", {
    timeZone: partnerTz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
