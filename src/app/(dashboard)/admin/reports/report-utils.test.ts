import { describe, it, expect } from "vitest";
import { REPORTS_LIMIT, summarizeReports, isResultCapped } from "./report-utils";

describe("summarizeReports", () => {
  it("empty array sums to zero", () => {
    expect(summarizeReports([])).toEqual({ count: 0, contacted: 0, appointments: 0, deals: 0 });
  });

  it("sums several rows", () => {
    expect(
      summarizeReports([
        { leads_contacted: 10, appointments_booked: 2, deals_closed: 1 },
        { leads_contacted: 5, appointments_booked: 3, deals_closed: 0 },
        { leads_contacted: 0, appointments_booked: 0, deals_closed: 4 },
      ]),
    ).toEqual({ count: 3, contacted: 15, appointments: 5, deals: 5 });
  });

  it("treats null and undefined counters as 0", () => {
    expect(
      summarizeReports([
        { leads_contacted: null, appointments_booked: undefined, deals_closed: 2 },
        {},
      ]),
    ).toEqual({ count: 2, contacted: 0, appointments: 0, deals: 2 });
  });

  it("handles large numbers without overflow", () => {
    expect(
      summarizeReports([
        { leads_contacted: 1000000000, appointments_booked: 500000000, deals_closed: 250000000 },
        { leads_contacted: 1000000000, appointments_booked: 500000000, deals_closed: 250000000 },
      ]),
    ).toEqual({ count: 2, contacted: 2000000000, appointments: 1000000000, deals: 500000000 });
  });
});

describe("isResultCapped", () => {
  it("boundary cases around the limit", () => {
    expect(isResultCapped(REPORTS_LIMIT - 1, REPORTS_LIMIT)).toBe(false);
    expect(isResultCapped(REPORTS_LIMIT, REPORTS_LIMIT)).toBe(true);
    expect(isResultCapped(REPORTS_LIMIT + 1, REPORTS_LIMIT)).toBe(true);
  });

  it("uses the real query limit by default", () => {
    expect(REPORTS_LIMIT).toBe(200);
    expect(isResultCapped(200)).toBe(true);
    expect(isResultCapped(0)).toBe(false);
  });
});
