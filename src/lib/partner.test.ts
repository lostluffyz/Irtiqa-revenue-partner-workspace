import { describe, it, expect, vi } from "vitest";
import {
  getProgramDay,
  LeadStatusUpdateSchema,
  DailyReportSchema,
} from "./partner";

// Mock server-side dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// ============================================
// Program Day Calculation
// ============================================

describe("getProgramDay", () => {
  it("returns day 1 on the start date", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(getProgramDay(today)).toBe(1);
  });

  it("returns day 2 one day after start", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    expect(getProgramDay(yesterday)).toBe(2);
  });

  it("returns day 30 about a month after start", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    expect(getProgramDay(thirtyDaysAgo)).toBe(30);
  });

  it("caps at 30 (day 31+ shows 30)", () => {
    const yearAgo = new Date(Date.now() - 364 * 86400000).toISOString().split("T")[0];
    expect(getProgramDay(yearAgo)).toBe(30);
  });

  it("returns negative for future dates (pre-program)", () => {
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    expect(getProgramDay(nextWeek)).toBeLessThan(0);
  });

  it("handles ISO date strings correctly", () => {
    const result = getProgramDay("2026-01-01");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(1);
  });
});

// ============================================
// Lead Status Update Schema
// ============================================

describe("LeadStatusUpdateSchema", () => {
  const UUID = "00000000-0000-4000-8000-000000000001";

  it("accepts valid lead ID and status", () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: UUID,
      status: "contacted",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid statuses", () => {
    const statuses = [
      "not_contacted",
      "contacted",
      "follow_up_required",
      "appointment_booked",
      "closed",
      "not_interested",
      "invalid_contact",
    ] as const;
    for (const status of statuses) {
      const result = LeadStatusUpdateSchema.safeParse({ leadId: UUID, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing leadId", () => {
    const result = LeadStatusUpdateSchema.safeParse({ status: "contacted" });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid leadId", () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: "not-a-uuid",
      status: "contacted",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: UUID,
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty status string", () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: UUID,
      status: "",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// Daily Report Schema
// ============================================

describe("DailyReportSchema", () => {
  it("accepts valid report data", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 5,
      appointmentsBooked: 2,
      dealsClosed: 1,
      biggestChallenge: "",
      additionalNotes: "",
    });
    expect(result.success).toBe(true);
  });

  it("coerces string numbers to integers", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: "3",
      appointmentsBooked: "1",
      dealsClosed: "0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leadsContacted).toBe(3);
      expect(result.data.appointmentsBooked).toBe(1);
      expect(result.data.dealsClosed).toBe(0);
    }
  });

  it("rejects negative numbers", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: -1,
      appointmentsBooked: 0,
      dealsClosed: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer numbers", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 1.5,
      appointmentsBooked: 0,
      dealsClosed: 0,
    });
    expect(result.success).toBe(false);
  });

  it("defaults optional fields to empty string", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 0,
      appointmentsBooked: 0,
      dealsClosed: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.biggestChallenge).toBe("");
      expect(result.data.additionalNotes).toBe("");
    }
  });

  it("rejects biggestChallenge exceeding 2000 chars", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 0,
      appointmentsBooked: 0,
      dealsClosed: 0,
      biggestChallenge: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects additionalNotes exceeding 5000 chars", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 0,
      appointmentsBooked: 0,
      dealsClosed: 0,
      additionalNotes: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts max-length biggestChallenge", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 0,
      appointmentsBooked: 0,
      dealsClosed: 0,
      biggestChallenge: "x".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("accepts max-length additionalNotes", () => {
    const result = DailyReportSchema.safeParse({
      leadsContacted: 0,
      appointmentsBooked: 0,
      dealsClosed: 0,
      additionalNotes: "x".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = DailyReportSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
