import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportsTable, type ReportRow } from "./reports-table";

const TODAY = "2026-10-07";

const ZERO_ROW: ReportRow = {
  id: "r-zero",
  partner_id: "p-1",
  report_date: "2026-10-07",
  leads_contacted: 0,
  appointments_booked: 0,
  deals_closed: 0,
  biggest_challenge: "   ",
  additional_notes: null,
  created_at: "2026-10-07T10:00:00.000Z",
  partnerName: "Aarav Shah",
  companyId: "IR-001",
};

const FULL_ROW: ReportRow = {
  id: "r-full",
  partner_id: "p-2",
  report_date: "2026-10-06",
  leads_contacted: 12,
  appointments_booked: 3,
  deals_closed: 1,
  biggest_challenge: "Gatekeeper blocked three site visits in a row today.",
  additional_notes: "Follow up with Priya on Thursday.\nBring the new rate card.",
  created_at: "2026-10-06T09:30:00.000Z",
  partnerName: "Diya Patel",
  companyId: null,
};

describe("ReportsTable collapsed state", () => {
  it("clamps text, marks buttons collapsed, shows dash for empty text", () => {
    const html = renderToStaticMarkup(
      <ReportsTable rows={[ZERO_ROW, FULL_ROW]} todayStr={TODAY} />,
    );
    expect(html).toContain("line-clamp-2");
    expect(html).toContain('aria-expanded="false"');
    // Whitespace-only challenge and null notes render the muted dash.
    expect(html).toContain(">—<");
    // Friendly dates with ISO tooltips.
    expect(html).toContain("Today");
    expect(html).toContain("Yesterday");
    expect(html).toContain('title="2026-10-07"');
    // Company ID shown only when loaded.
    expect(html).toContain("IR-001");
    // Collapsed: full long text is in the DOM (CSS clamp, no JS slice),
    // but no expanded details row exists yet.
    expect(html).toContain("Gatekeeper blocked three site visits");
    expect(html).not.toContain('id="report-details-r-full"');
    expect(html).toContain('aria-label="Show full report"');
  });

  it("zero values are muted, non-zero values are strong", () => {
    const html = renderToStaticMarkup(
      <ReportsTable rows={[ZERO_ROW, FULL_ROW]} todayStr={TODAY} />,
    );
    expect(html).toContain("font-normal text-[var(--text-3)]");
    expect(html).toContain("font-semibold text-[var(--text-1)]");
  });
});

describe("ReportsTable expanded state", () => {
  it("expanded row contains the full text of both fields", () => {
    const html = renderToStaticMarkup(
      <ReportsTable rows={[FULL_ROW]} todayStr={TODAY} defaultExpandedIds={["r-full"]} />,
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Hide full report"');
    expect(html).toContain('aria-controls="report-details-r-full"');
    expect(html).toContain('id="report-details-r-full"');
    expect(html).toContain("Gatekeeper blocked three site visits in a row today.");
    expect(html).toContain("Follow up with Priya on Thursday.");
    expect(html).toContain("Biggest challenge");
    expect(html).toContain("Additional notes");
    // Submission timestamp footer (created_at is loaded).
    expect(html).toContain("Submitted");
  });
});
