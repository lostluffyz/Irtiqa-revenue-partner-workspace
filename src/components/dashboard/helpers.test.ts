import { describe, it, expect } from "vitest";
import { formatReportDate, getBreadcrumbSegments, formatWebsiteHostname, formatShortMonthDay, formatShortDateRange, formatJobDateTime, getViewerShortZoneName } from "./helpers";

describe("formatReportDate", () => {
  it("returns Today for the reference date", () => {
    expect(formatReportDate("2026-10-04", "2026-10-04")).toBe("Today");
  });

  it("returns Yesterday for the previous day", () => {
    expect(formatReportDate("2026-10-03", "2026-10-04")).toBe("Yesterday");
  });

  it("handles month boundaries", () => {
    expect(formatReportDate("2026-09-30", "2026-10-01")).toBe("Yesterday");
    expect(formatReportDate("2026-09-28", "2026-10-04")).toBe("Sep 28");
  });

  it("handles year boundaries", () => {
    expect(formatReportDate("2025-12-31", "2026-01-01")).toBe("Yesterday");
    expect(formatReportDate("2025-12-25", "2026-01-04")).toBe("Dec 25, 2025");
  });

  it("handles leap days", () => {
    expect(formatReportDate("2024-02-29", "2024-03-01")).toBe("Yesterday");
    expect(formatReportDate("2024-02-29", "2024-03-05")).toBe("Feb 29");
  });

  it("omits the year within the same year, includes it otherwise", () => {
    expect(formatReportDate("2026-10-02", "2026-10-04")).toBe("Oct 2");
    expect(formatReportDate("2025-10-02", "2026-10-04")).toBe("Oct 2, 2025");
  });

  it("returns future dates as month/day without Today/Yesterday", () => {
    expect(formatReportDate("2026-10-05", "2026-10-04")).toBe("Oct 5");
  });

  it("returns invalid input unchanged", () => {
    expect(formatReportDate("not-a-date", "2026-10-04")).toBe("not-a-date");
    expect(formatReportDate("", "2026-10-04")).toBe("");
    expect(formatReportDate("2026-13-01", "2026-10-04")).toBe("2026-13-01");
  });

  it("never shifts the day via timezone parsing", () => {
    // A naive new Date("2026-10-02") renders Oct 1 east of UTC;
    // the formatter must not do that regardless of runtime TZ.
    expect(formatReportDate("2026-10-02", "2026-10-02")).toBe("Today");
    expect(formatReportDate("2026-01-01", "2026-06-15")).toBe("Jan 1");
  });
});

describe("formatWebsiteHostname", () => {
  it("strips protocol, www, path, query, and utm params", () => {
    expect(
      formatWebsiteHostname("https://www.acme.com/blog?utm_source=x&utm_medium=y"),
    ).toBe("acme.com");
    expect(formatWebsiteHostname("http://example.com/")).toBe("example.com");
    expect(formatWebsiteHostname("https://shop.example.co.uk/p/1?x=2")).toBe(
      "shop.example.co.uk",
    );
  });

  it("handles URLs without protocol", () => {
    expect(formatWebsiteHostname("acme.com/pricing")).toBe("acme.com");
    expect(formatWebsiteHostname("www.acme.com")).toBe("acme.com");
  });

  it("lowercases hostnames", () => {
    expect(formatWebsiteHostname("https://WWW.Acme.COM")).toBe("acme.com");
  });

  it("returns invalid or empty input unchanged", () => {
    expect(formatWebsiteHostname("not a url at all")).toBe("not a url at all");
    expect(formatWebsiteHostname("")).toBe("");
    expect(formatWebsiteHostname("   ")).toBe("");
  });
});

describe("formatShortMonthDay / formatShortDateRange", () => {  it("formats plain dates without timezone shifting", () => {
    expect(formatShortMonthDay("2026-09-14")).toBe("Sep 14");
    expect(formatShortMonthDay("2026-01-05")).toBe("Jan 5");
    expect(formatShortDateRange("2026-10-02", "2026-10-09")).toBe("Oct 2 – Oct 9");
  });

  it("handles month and year boundaries", () => {
    expect(formatShortDateRange("2025-12-30", "2026-01-06")).toBe("Dec 30 – Jan 6");
    expect(formatShortMonthDay("2024-02-29")).toBe("Feb 29");
  });

  it("returns invalid input unchanged", () => {
    expect(formatShortMonthDay("nope")).toBe("nope");
    expect(formatShortDateRange("2026-13-01", "2026-10-09")).toBe("2026-13-01 – Oct 9");
  });
});

describe("getBreadcrumbSegments", () => {
  it("maps admin routes to section + page", () => {
    expect(getBreadcrumbSegments("/admin")).toEqual({ section: "Admin", page: "Dashboard" });
    expect(getBreadcrumbSegments("/admin/partners")).toEqual({ section: "Admin", page: "Partners" });
    expect(getBreadcrumbSegments("/admin/partners/create")).toEqual({ section: "Admin", page: "Add Partner" });
    expect(getBreadcrumbSegments("/admin/partners/some-uuid")).toEqual({ section: "Admin", page: "Partner Details" });
    expect(getBreadcrumbSegments("/admin/leads")).toEqual({ section: "Admin", page: "Leads" });
    expect(getBreadcrumbSegments("/admin/leads/upload")).toEqual({ section: "Admin", page: "Upload Leads" });
    expect(getBreadcrumbSegments("/admin/allocation")).toEqual({ section: "Admin", page: "Allocation" });
    expect(getBreadcrumbSegments("/admin/scrape")).toEqual({ section: "Admin", page: "Lead Scraper" });
    expect(getBreadcrumbSegments("/admin/reports")).toEqual({ section: "Admin", page: "Reports" });
    expect(getBreadcrumbSegments("/admin/activity")).toEqual({ section: "Admin", page: "Activity" });
    expect(getBreadcrumbSegments("/admin/announcements/new")).toEqual({ section: "Admin", page: "New Announcement" });
    expect(getBreadcrumbSegments("/admin/resources")).toEqual({ section: "Admin", page: "Resources" });
  });

  it("maps partner routes to section + page", () => {
    expect(getBreadcrumbSegments("/partner")).toEqual({ section: "Partner", page: "Dashboard" });
    expect(getBreadcrumbSegments("/partner/leads")).toEqual({ section: "Partner", page: "My Leads" });
    expect(getBreadcrumbSegments("/partner/report")).toEqual({ section: "Partner", page: "Daily Report" });
    expect(getBreadcrumbSegments("/partner/progress")).toEqual({ section: "Partner", page: "Progress" });
    expect(getBreadcrumbSegments("/partner/announcements")).toEqual({ section: "Partner", page: "Announcements" });
    expect(getBreadcrumbSegments("/partner/resources")).toEqual({ section: "Partner", page: "Resources" });
  });
});

describe("formatJobDateTime", () => {
  it("formats a full timestamp without a zone suffix (UTC pinned)", () => {
    expect(formatJobDateTime("2026-10-04T12:30:00Z", "UTC")).toBe("Oct 4, 12:30 PM");
    expect(formatJobDateTime("2026-01-05T08:05:00Z", "UTC")).toBe("Jan 5, 8:05 AM");
  });

  it("handles month and year boundaries", () => {
    expect(formatJobDateTime("2025-12-31T23:45:00Z", "UTC")).toBe("Dec 31, 11:45 PM");
    expect(formatJobDateTime("2026-01-01T00:05:00Z", "UTC")).toBe("Jan 1, 12:05 AM");
  });

  it("returns invalid input unchanged", () => {
    expect(formatJobDateTime("not-a-date", "UTC")).toBe("not-a-date");
    expect(formatJobDateTime("", "UTC")).toBe("");
  });
});

describe("getViewerShortZoneName", () => {
  it("names an explicit zone deterministically", () => {
    expect(getViewerShortZoneName(new Date("2026-10-04T12:00:00Z"), "UTC")).toBe("UTC");
  });

  it("returns a non-empty name for the viewer locale", () => {
    expect(getViewerShortZoneName().length).toBeGreaterThan(0);
  });
});
