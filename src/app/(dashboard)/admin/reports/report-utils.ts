/* ══════════════════════════════════════════════════════════════
   Report utils — pure display helpers for the admin Daily Reports page.

   REPORTS_LIMIT mirrors the row cap in the page's Supabase query
   (.limit(REPORTS_LIMIT)); the query's filters, ordering and cap are
   unchanged — only the literal is named so the UI copy ("Showing the
   latest N…") can reference the real number.
   ══════════════════════════════════════════════════════════════ */

/** Row cap used by the reports query. Keep in sync with .limit() in page.tsx. */
export const REPORTS_LIMIT = 200;

export interface ReportCounterRow {
  leads_contacted?: number | null;
  appointments_booked?: number | null;
  deals_closed?: number | null;
}

export interface ReportSummary {
  count: number;
  contacted: number;
  appointments: number;
  deals: number;
}

/**
 * Sum the counters of the loaded rows. Null/undefined counters count as 0.
 * Totals always reflect the loaded rows only (which may be capped).
 */
export function summarizeReports(rows: ReportCounterRow[]): ReportSummary {
  let contacted = 0;
  let appointments = 0;
  let deals = 0;
  for (const row of rows) {
    contacted += row.leads_contacted ?? 0;
    appointments += row.appointments_booked ?? 0;
    deals += row.deals_closed ?? 0;
  }
  return { count: rows.length, contacted, appointments, deals };
}

/**
 * Whether the loaded row count hit the query cap (older rows may exist).
 * Boundary: limit-1 → false, limit → true, limit+1 → true.
 */
export function isResultCapped(count: number, limit: number = REPORTS_LIMIT): boolean {
  return count >= limit;
}
