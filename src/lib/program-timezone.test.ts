// ============================================
// Program Timezone Tests
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getBusinessDate,
  getProgramDay,
  getProgramStatus,
  isProgramActive,
  formatBusinessDate,
  getPartnerTimezone,
  getTimezoneLabel,
  getUTCOffset,
  formatUTC,
  formatPartnerTime,
  formatDeadlineInTimezone,
  REGION_TIMEZONE_MAP,
} from "./program-timezone";

// ============================================
// getBusinessDate
// ============================================

describe("getBusinessDate", () => {
  beforeEach(() => {
    // Freeze time at 2026-07-14T12:00:00Z (noon UTC)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's date in UTC timezone", () => {
    const result = getBusinessDate("UTC");
    expect(result).toBe("2026-07-14");
  });

  it("returns a different date in Asia/Kolkata when UTC is close to midnight boundary", () => {
    // At 2026-07-14T12:00:00Z:
    // Asia/Kolkata is UTC+5:30 => 2026-07-14T17:30:00 IST
    // Same day still
    const result = getBusinessDate("Asia/Kolkata");
    expect(result).toBe("2026-07-14");
  });

  it("shows next day in Asia/Kolkata when UTC is 23:00", () => {
    vi.setSystemTime(new Date("2026-07-14T23:00:00Z"));
    // Asia/Kolkata is UTC+5:30 => 2026-07-15T04:30:00
    const result = getBusinessDate("Asia/Kolkata");
    expect(result).toBe("2026-07-15");
  });

  it("shows previous day in America/New_York when UTC is early", () => {
    vi.setSystemTime(new Date("2026-07-14T03:00:00Z"));
    // America/New_York is UTC-4 (EDT in July) => 2026-07-13T23:00:00
    const result = getBusinessDate("America/New_York");
    expect(result).toBe("2026-07-13");
  });
});

// ============================================
// getProgramDay
// ============================================

describe("getProgramDay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns day 1 on the start date", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    expect(getProgramDay("2026-07-14", "UTC")).toBe(1);
  });

  it("returns day 2 one day after start", () => {
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
    expect(getProgramDay("2026-07-14", "UTC")).toBe(2);
  });

  it("returns day 30 on day 29 after start", () => {
    vi.setSystemTime(new Date("2026-08-12T12:00:00Z"));
    expect(getProgramDay("2026-07-14", "UTC")).toBe(30);
  });

  it("caps at 30 after one year", () => {
    vi.setSystemTime(new Date("2027-07-14T12:00:00Z"));
    expect(getProgramDay("2026-07-14", "UTC")).toBe(30);
  });

  it("caps at 30 (day 31+ shows 30)", () => {
    vi.setSystemTime(new Date("2027-07-15T12:00:00Z"));
    expect(getProgramDay("2026-07-14", "UTC")).toBe(30);
  });

  it("returns negative for future start dates (pre-program)", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    // Program starts in 5 days (July 19)
    const day = getProgramDay("2026-07-19", "UTC");
    expect(day).toBeLessThan(0);
    // July 14 - July 19 = -5 days
    expect(day).toBe(-5);
  });

  it("returns -1 for tomorrow (start date == today + 1)", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    const day = getProgramDay("2026-07-15", "UTC");
    // July 14 - July 15 = -1 day
    expect(day).toBe(-1);
  });
});

// ============================================
// getProgramStatus
// ============================================

describe("getProgramStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns pre phase when program hasn't started", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    const status = getProgramStatus("2026-07-20", "UTC");
    expect(status.phase).toBe("pre");
    expect(status.programDay).toBe(0);
    expect(status.daysUntilStart).toBe(6);
  });

  it("returns active phase when program is running", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    const status = getProgramStatus("2026-07-01", "UTC");
    expect(status.phase).toBe("active");
    expect(status.programDay).toBe(14);
    expect(status.daysUntilStart).toBe(0);
    expect(status.daysRemaining).toBe(16);
  });

  it("returns post phase after day 30", () => {
    vi.setSystemTime(new Date("2027-07-14T12:00:00Z"));
    const status = getProgramStatus("2026-07-14", "UTC");
    expect(status.phase).toBe("post");
    expect(status.programDay).toBe(30);
    expect(status.daysRemaining).toBe(0);
  });

  it("pre: daysUntilStart counts correctly for start date 1 day away", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    const status = getProgramStatus("2026-07-15", "UTC");
    expect(status.phase).toBe("pre");
    expect(status.daysUntilStart).toBe(1);
    expect(status.programDay).toBe(0);
  });

  it("active: day 1 on start date", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    const status = getProgramStatus("2026-07-14", "UTC");
    expect(status.phase).toBe("active");
    expect(status.programDay).toBe(1);
  });
});

// ============================================
// isProgramActive
// ============================================

describe("isProgramActive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true on day 1", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    expect(isProgramActive("2026-07-14", "UTC")).toBe(true);
  });

  it("returns false before start", () => {
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    expect(isProgramActive("2026-07-20", "UTC")).toBe(false);
  });

  it("returns true on day 30", () => {
    vi.setSystemTime(new Date("2027-07-14T12:00:00Z"));
    expect(isProgramActive("2026-07-14", "UTC")).toBe(true);
  });

  it("returns true for long-running program (capped at 30)", () => {
    vi.setSystemTime(new Date("2028-07-14T12:00:00Z"));
    expect(isProgramActive("2026-07-14", "UTC")).toBe(true);
  });
});

// ============================================
// Timezone boundary: UTC vs Asia/Kolkata
// ============================================

describe("Timezone boundary: UTC vs Asia/Kolkata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("can differ at 23:00 UTC", () => {
    vi.setSystemTime(new Date("2026-07-14T23:00:00Z"));

    const utcDate = getBusinessDate("UTC");
    const istDate = getBusinessDate("Asia/Kolkata");

    // UTC says July 14, IST says July 15
    expect(utcDate).toBe("2026-07-14");
    expect(istDate).toBe("2026-07-15");
    expect(utcDate).not.toBe(istDate);
  });

  it("program day differs when UTC/Kolkata dates differ", () => {
    // Start: July 10
    // Now: 23:00 UTC July 14 => July 15 IST
    vi.setSystemTime(new Date("2026-07-14T23:00:00Z"));

    const utcDay = getProgramDay("2026-07-10", "UTC");
    const istDay = getProgramDay("2026-07-10", "Asia/Kolkata");

    // UTC: July 14 - July 10 = 4 days diff => Day 5
    // IST: July 15 - July 10 = 5 days diff => Day 6
    expect(utcDay).toBe(5);
    expect(istDay).toBe(6);
    expect(utcDay).not.toBe(istDay);
  });

  it("daily report date uses business date (not UTC)", () => {
    // At 23:00 UTC, a partner in IST should submit for July 15, not July 14
    vi.setSystemTime(new Date("2026-07-14T23:00:00Z"));

    const reportDate = getBusinessDate("Asia/Kolkata");
    expect(reportDate).toBe("2026-07-15");

    const utcDate = getBusinessDate("UTC");
    expect(utcDate).toBe("2026-07-14");
  });
});

// ============================================
// formatBusinessDate
// ============================================

describe("formatBusinessDate", () => {
  it("formats a date string for display", () => {
    const result = formatBusinessDate("2026-07-14", "UTC");
    expect(result).toBe("Jul 14, 2026");
  });
});

// ============================================
// getPartnerTimezone
// ============================================

describe("getPartnerTimezone", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns timezone from REGION_TIMEZONE_MAP for known region", () => {
    expect(getPartnerTimezone("India")).toBe("Asia/Kolkata");
    expect(getPartnerTimezone("North America")).toBe("America/New_York");
    expect(getPartnerTimezone("Europe")).toBe("Europe/London");
  });

  it("returns partner timezone override when provided", () => {
    // Even if region maps to something else, partner timezone takes priority
    expect(getPartnerTimezone("India", "America/Los_Angeles")).toBe("America/Los_Angeles");
  });

  it("falls back to PROGRAM_TIMEZONE for unknown region", () => {
    vi.stubEnv("PROGRAM_TIMEZONE", "Asia/Tokyo");
    expect(getPartnerTimezone("Unknown Region")).toBe("Asia/Tokyo");
  });

  it("falls back to PROGRAM_TIMEZONE when region is null", () => {
    vi.stubEnv("PROGRAM_TIMEZONE", "Europe/Berlin");
    expect(getPartnerTimezone(null)).toBe("Europe/Berlin");
  });

  it("falls back to PROGRAM_TIMEZONE when no env and null region", () => {
    // vitest.config sets PROGRAM_TIMEZONE=UTC globally
    expect(getPartnerTimezone(null)).toBe("UTC");
  });
});

// ============================================
// getTimezoneLabel
// ============================================

describe("getTimezoneLabel", () => {
  it("returns IST for Asia/Kolkata", () => {
    expect(getTimezoneLabel("Asia/Kolkata")).toBe("IST");
  });

  it("returns a short label for UTC", () => {
    const label = getTimezoneLabel("UTC");
    expect(label).toMatch(/^[A-Z]+$/); // e.g. "UTC", "GMT"
  });

  it("returns a short label for America/New_York", () => {
    const label = getTimezoneLabel("America/New_York");
    // Could be EDT or EST depending on time of year
    expect(["EDT", "EST"]).toContain(label);
  });

  it("returns a short label for Europe/London", () => {
    const label = getTimezoneLabel("Europe/London");
    expect(["BST", "GMT"]).toContain(label);
  });
});

// ============================================
// getUTCOffset
// ============================================

describe("getUTCOffset", () => {
  it("returns +05:30 for Asia/Kolkata", () => {
    expect(getUTCOffset("Asia/Kolkata")).toBe("+05:30");
  });

  it("returns +00:00 for UTC", () => {
    expect(getUTCOffset("UTC")).toBe("+00:00");
  });

  it("returns an offset string for America/New_York", () => {
    const offset = getUTCOffset("America/New_York");
    // EDT = -04:00, EST = -05:00
    expect(["-04:00", "-05:00"]).toContain(offset);
  });
});

// ============================================
// formatUTC
// ============================================

describe("formatUTC", () => {
  it("formats a UTC date correctly", () => {
    const date = new Date("2026-07-15T18:30:00Z");
    expect(formatUTC(date)).toBe("6:30 PM");
  });

  it("formats midnight UTC", () => {
    const date = new Date("2026-07-15T00:00:00Z");
    expect(formatUTC(date)).toBe("12:00 AM");
  });

  it("formats noon UTC", () => {
    const date = new Date("2026-07-15T12:00:00Z");
    expect(formatUTC(date)).toBe("12:00 PM");
  });
});

// ============================================
// formatPartnerTime
// ============================================

describe("formatPartnerTime", () => {
  it("formats time in Asia/Kolkata timezone", () => {
    // 18:30 UTC = 00:00 next day IST
    const date = new Date("2026-07-15T18:30:00Z");
    expect(formatPartnerTime(date, "Asia/Kolkata")).toBe("12:00 AM");
  });

  it("formats time in UTC timezone", () => {
    const date = new Date("2026-07-15T14:15:00Z");
    expect(formatPartnerTime(date, "UTC")).toBe("2:15 PM");
  });
});

// ============================================
// formatDeadlineInTimezone
// ============================================

describe("formatDeadlineInTimezone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("converts 18:00 UTC deadline to IST (23:30)", () => {
    // July 15, 18:00 UTC = July 15, 23:30 IST
    expect(formatDeadlineInTimezone(18, 0, "Asia/Kolkata")).toBe("11:30 PM");
  });

  it("converts 18:00 UTC deadline to UTC (18:00)", () => {
    expect(formatDeadlineInTimezone(18, 0, "UTC")).toBe("6:00 PM");
  });

  it("converts 18:00 UTC to New York time", () => {
    // July 15, 18:00 UTC = July 15, 14:00 EDT (UTC-4)
    expect(formatDeadlineInTimezone(18, 0, "America/New_York")).toBe("2:00 PM");
  });

  it("converts 9:30 UTC deadline to IST", () => {
    // July 15, 09:30 UTC = July 15, 15:00 IST
    expect(formatDeadlineInTimezone(9, 30, "Asia/Kolkata")).toBe("3:00 PM");
  });
});

// ============================================
// REGION_TIMEZONE_MAP
// ============================================

describe("REGION_TIMEZONE_MAP", () => {
  it("has entries for all expected regions", () => {
    expect(REGION_TIMEZONE_MAP).toHaveProperty("India");
    expect(REGION_TIMEZONE_MAP).toHaveProperty("North America");
    expect(REGION_TIMEZONE_MAP).toHaveProperty("Europe");
    expect(REGION_TIMEZONE_MAP).toHaveProperty("Asia Pacific");
  });

  it("all values are valid IANA timezone strings", () => {
    for (const tz of Object.values(REGION_TIMEZONE_MAP)) {
      // Verify the timezone is recognized by Intl
      expect(() => {
        new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
      }).not.toThrow();
    }
  });
});
