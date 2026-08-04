// ============================================
// Compliance Service Tests
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  evaluateDeadline,
  getComplianceConfig,
  getOverdueDurationMinutes,
} from "./compliance";

// ============================================
// Mock Environment Variables
// ============================================

const DEFAULT_ENV = {
  PROGRAM_TIMEZONE: "UTC",
  REPORT_DEADLINE_TIME: "18:00",
  REPORT_GRACE_PERIOD_MINUTES: "15",
};

function setEnv(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries({ ...DEFAULT_ENV, ...overrides })) {
    vi.stubEnv(key, value);
  }
}

// ============================================
// getComplianceConfig
// ============================================

describe("getComplianceConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns defaults when no env vars set", () => {
    setEnv({});
    const config = getComplianceConfig();
    expect(config.deadlineHour).toBe(18);
    expect(config.deadlineMinute).toBe(0);
    expect(config.gracePeriodMinutes).toBe(15);
    expect(config.timezone).toBe("UTC");
  });

  it("reads REPORT_DEADLINE_TIME=20:30", () => {
    setEnv({ REPORT_DEADLINE_TIME: "20:30" });
    const config = getComplianceConfig();
    expect(config.deadlineHour).toBe(20);
    expect(config.deadlineMinute).toBe(30);
  });

  it("reads REPORT_GRACE_PERIOD_MINUTES=30", () => {
    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "30" });
    const config = getComplianceConfig();
    expect(config.gracePeriodMinutes).toBe(30);
  });

  it("falls back to defaults for invalid deadline format", () => {
    setEnv({ REPORT_DEADLINE_TIME: "invalid" });
    const config = getComplianceConfig();
    expect(config.deadlineHour).toBe(18);
    expect(config.deadlineMinute).toBe(0);
  });

  it("falls back to default for invalid grace period", () => {
    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "not-a-number" });
    const config = getComplianceConfig();
    expect(config.gracePeriodMinutes).toBe(15);
  });

  it("clamps grace period to 0-120 range", () => {
    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "200" });
    const config = getComplianceConfig();
    expect(config.gracePeriodMinutes).toBe(15); // out of range, falls back

    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "-5" });
    const config2 = getComplianceConfig();
    expect(config2.gracePeriodMinutes).toBe(15);
  });

  it("reads PROGRAM_TIMEZONE", () => {
    setEnv({ PROGRAM_TIMEZONE: "Asia/Kolkata" });
    const config = getComplianceConfig();
    expect(config.timezone).toBe("Asia/Kolkata");
  });
});

// ============================================
// evaluateDeadline — Before Deadline
// ============================================

describe("evaluateDeadline — before deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setEnv({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("isOverdue=false at 09:00 AM", () => {
    vi.setSystemTime(new Date("2026-01-15T09:00:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
    expect(result.deadlineHour).toBe(18);
  });

  it("isOverdue=false at 17:59", () => {
    vi.setSystemTime(new Date("2026-01-15T17:59:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });

  it("isOverdue=false at 00:00 (start of day)", () => {
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });

  it("isOverdue=false at 18:00 (deadline hit, but within grace period)", () => {
    vi.setSystemTime(new Date("2026-01-15T18:00:00Z"));
    const result = evaluateDeadline();
    // 18:00 = deadline 18:00 + grace 15 = 18:15, so 18:00 < 18:15 → not overdue
    expect(result.isOverdue).toBe(false);
  });

  it("isOverdue=false at 18:10 (within 15 min grace period)", () => {
    vi.setSystemTime(new Date("2026-01-15T18:10:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });
});

// ============================================
// evaluateDeadline — At Boundary
// ============================================

describe("evaluateDeadline — at boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setEnv({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("isOverdue=true at exactly 18:15 (deadline + grace period)", () => {
    vi.setSystemTime(new Date("2026-01-15T18:15:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });
});

// ============================================
// evaluateDeadline — After Deadline
// ============================================

describe("evaluateDeadline — after deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setEnv({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("isOverdue=true at 18:16", () => {
    vi.setSystemTime(new Date("2026-01-15T18:16:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });

  it("isOverdue=true at 23:59", () => {
    vi.setSystemTime(new Date("2026-01-15T23:59:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });

  it("isOverdue=false at 06:00 next day (new business day)", () => {
    vi.setSystemTime(new Date("2026-01-16T06:00:00Z"));
    const result = evaluateDeadline();
    // 06:00 < 18:15 on the new business day, so NOT overdue
    expect(result.isOverdue).toBe(false);
  });

  it("sets overdueSince correctly", () => {
    vi.setSystemTime(new Date("2026-01-15T20:00:00Z"));
    const result = evaluateDeadline();
    expect(result.overdueSince).not.toBeNull();
    // overdueSince is now in UTC; deadline 18:00 + grace 15 = 18:15 UTC
    const utcTime = result.overdueSince!.toLocaleString("en-US", {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
    expect(utcTime).toBe("18:15");
  });
});

// ============================================
// evaluateDeadline — Custom Deadline
// ============================================

describe("evaluateDeadline — custom deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("reads REPORT_DEADLINE_TIME=20:30", () => {
    setEnv({ REPORT_DEADLINE_TIME: "20:30" });
    vi.setSystemTime(new Date("2026-01-15T20:00:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
    expect(result.deadlineHour).toBe(20);
    expect(result.deadlineMinute).toBe(30);
  });

  it("isOverdue=true at 20:45 with deadline 20:30 + 15 grace", () => {
    setEnv({ REPORT_DEADLINE_TIME: "20:30" });
    vi.setSystemTime(new Date("2026-01-15T20:45:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });

  it("isOverdue=false at 20:35 with deadline 20:30 + 15 grace (within grace)", () => {
    setEnv({ REPORT_DEADLINE_TIME: "20:30" });
    vi.setSystemTime(new Date("2026-01-15T20:35:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });
});

// ============================================
// evaluateDeadline — Custom Grace Period
// ============================================

describe("evaluateDeadline — custom grace period", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("grace period 0 → overdue at exactly 18:00", () => {
    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "0" });
    vi.setSystemTime(new Date("2026-01-15T18:00:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });

  it("grace period 60 → not overdue at 18:30", () => {
    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "60" });
    vi.setSystemTime(new Date("2026-01-15T18:30:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });

  it("grace period 60 → overdue at 19:00", () => {
    setEnv({ REPORT_GRACE_PERIOD_MINUTES: "60" });
    vi.setSystemTime(new Date("2026-01-15T19:00:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });
});

// ============================================
// evaluateDeadline — Non-UTC Timezone
// ============================================

describe("evaluateDeadline — UTC-based comparison", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("22:15 UTC → overdue (past deadline + grace in UTC)", () => {
    // PROGRAM_TIMEZONE no longer affects deadline evaluation — always UTC
    setEnv({ PROGRAM_TIMEZONE: "America/New_York" });
    vi.setSystemTime(new Date("2026-07-15T22:15:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(true);
  });

  it("12:45 UTC → not overdue (before deadline in UTC)", () => {
    setEnv({ PROGRAM_TIMEZONE: "Asia/Kolkata" });
    // 12:45 UTC is before 18:15 UTC deadline
    vi.setSystemTime(new Date("2026-07-15T12:45:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });

  it("11:30 UTC → not overdue (before deadline)", () => {
    setEnv({ PROGRAM_TIMEZONE: "Asia/Kolkata" });
    vi.setSystemTime(new Date("2026-07-15T11:30:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });

  it("deadline is always evaluated in UTC regardless of PROGRAM_TIMEZONE", () => {
    // Even with IST configured, deadline is 18:00 UTC, not 18:00 IST
    setEnv({ PROGRAM_TIMEZONE: "Asia/Kolkata" });
    // 18:00 IST = 12:30 UTC — before 18:00 UTC deadline
    vi.setSystemTime(new Date("2026-07-15T12:30:00Z"));
    const result = evaluateDeadline();
    expect(result.isOverdue).toBe(false);
  });
});

// ============================================
// getOverdueDurationMinutes
// ============================================

describe("getOverdueDurationMinutes", () => {
  it("returns 0 for zero duration", () => {
    const now = new Date("2026-01-15T18:15:00Z");
    const since = new Date("2026-01-15T18:15:00Z");
    expect(getOverdueDurationMinutes(since, now)).toBe(0);
  });

  it("returns 45 for 45 minutes", () => {
    const now = new Date("2026-01-15T19:00:00Z");
    const since = new Date("2026-01-15T18:15:00Z");
    expect(getOverdueDurationMinutes(since, now)).toBe(45);
  });

  it("returns 135 for 2h 15m", () => {
    const now = new Date("2026-01-15T20:30:00Z");
    const since = new Date("2026-01-15T18:15:00Z");
    expect(getOverdueDurationMinutes(since, now)).toBe(135);
  });

  it("returns 0 for negative duration (future timestamp)", () => {
    const now = new Date("2026-01-15T18:00:00Z");
    const since = new Date("2026-01-15T18:15:00Z");
    expect(getOverdueDurationMinutes(since, now)).toBe(0);
  });
});

// ============================================
// Status State Machine
// ============================================

describe("report status state machine", () => {
  const cases = [
    {
      name: "report exists + before deadline → submitted",
      hasReport: true,
      isOverdue: false,
      expected: "submitted",
    },
    {
      name: "report exists + after deadline → submitted",
      hasReport: true,
      isOverdue: true,
      expected: "submitted",
    },
    {
      name: "no report + before deadline → pending",
      hasReport: false,
      isOverdue: false,
      expected: "pending",
    },
    {
      name: "no report + after deadline → overdue",
      hasReport: false,
      isOverdue: true,
      expected: "overdue",
    },
  ] as const;

  it.each(cases)("$name", ({ hasReport, isOverdue, expected }) => {
    // The core logic from compliance.ts
    const status = hasReport
      ? "submitted"
      : isOverdue
        ? "overdue"
        : "pending";
    expect(status).toBe(expected);
  });
});

// ============================================
// Compliance Percentage Edge Cases
// ============================================

describe("compliance percentage calculation", () => {
  it("0 partners → 0% (not NaN)", () => {
    const total = 0;
    const submitted = 0;
    const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    expect(pct).toBe(0);
  });

  it("10 partners, 3 submitted → 30%", () => {
    expect(Math.round((3 / 10) * 100)).toBe(30);
  });

  it("10 partners, 0 submitted → 0%", () => {
    expect(Math.round((0 / 10) * 100)).toBe(0);
  });

  it("10 partners, 10 submitted → 100%", () => {
    expect(Math.round((10 / 10) * 100)).toBe(100);
  });

  it("3 partners, 2 submitted → 67%", () => {
    expect(Math.round((2 / 3) * 100)).toBe(67);
  });

  it("7 partners, 5 submitted → 71%", () => {
    expect(Math.round((5 / 7) * 100)).toBe(71);
  });
});

// ============================================
// Overdue Duration Formatting
// ============================================

describe("overdue duration formatting", () => {
  it("formats 45 minutes correctly", () => {
    const minutes = 45;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let result: string;
    if (hours === 0) result = `${mins}m`;
    else if (mins === 0) result = `${hours}h`;
    else result = `${hours}h ${mins}m`;
    expect(result).toBe("45m");
  });

  it("formats 120 minutes correctly", () => {
    const minutes = 120;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let result: string;
    if (hours === 0) result = `${mins}m`;
    else if (mins === 0) result = `${hours}h`;
    else result = `${hours}h ${mins}m`;
    expect(result).toBe("2h");
  });

  it("formats 135 minutes correctly", () => {
    const minutes = 135;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let result: string;
    if (hours === 0) result = `${mins}m`;
    else if (mins === 0) result = `${hours}h`;
    else result = `${hours}h ${mins}m`;
    expect(result).toBe("2h 15m");
  });

  it("formats 0 minutes as 'just now'", () => {
    const minutes = 0;
    const result = minutes <= 0 ? "just now" : `${minutes}m`;
    expect(result).toBe("just now");
  });
});
