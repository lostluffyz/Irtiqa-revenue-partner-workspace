// ============================================
// Scrape Job — Tests
// ============================================
//
// Tests validation schemas, status transitions, and pure logic.
// No DB mocks needed for pure function tests.

import { describe, it, expect } from "vitest";
import {
  CreateScrapeJobSchema,
  isValidTransition,
  type ScrapeJobStatus,
} from "./scrape-job";

// ============================================
// Validation Schema Tests
// ============================================

describe("CreateScrapeJobSchema", () => {
  it("accepts valid input", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: 100,
      extract_emails: false,
      dry_run: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty query", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "",
      location: "Germany",
      requested_count: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty location", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "",
      requested_count: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero requested_count", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative requested_count", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects requested_count > 1000", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: 1001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts requested_count = 1000", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("defaults extract_emails to false", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extract_emails).toBe(false);
    }
  });

  it("defaults dry_run to true", () => {
    const result = CreateScrapeJobSchema.safeParse({
      query: "software companies",
      location: "Germany",
      requested_count: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dry_run).toBe(true);
    }
  });
});

// ============================================
// Status Transition Tests
// ============================================

describe("isValidTransition", () => {
  const validTransitions: [ScrapeJobStatus, ScrapeJobStatus][] = [
    ["pending", "running"],
    ["pending", "cancelled"],
    ["pending", "failed"],
    ["running", "completed"],
    ["running", "partial"],
    ["running", "failed"],
  ];

  const invalidTransitions: [ScrapeJobStatus, ScrapeJobStatus][] = [
    ["completed", "pending"],
    ["completed", "running"],
    ["failed", "pending"],
    ["failed", "running"],
    ["cancelled", "pending"],
    ["cancelled", "running"],
    ["running", "pending"],
    ["running", "cancelled"],
    ["pending", "completed"],
    ["pending", "partial"],
  ];

  it.each(validTransitions)(
    "allows %s → %s",
    (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    },
  );

  it.each(invalidTransitions)(
    "rejects %s → %s",
    (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    },
  );

  it("rejects same-status transition", () => {
    expect(isValidTransition("pending", "pending")).toBe(false);
    expect(isValidTransition("running", "running")).toBe(false);
    expect(isValidTransition("completed", "completed")).toBe(false);
  });
});
