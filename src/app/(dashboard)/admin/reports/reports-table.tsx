"use client";

import { useState, Fragment } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  formatReportDate,
  formatJobDateTime,
  getViewerShortZoneName,
} from "@/components/dashboard/helpers";

/* ══════════════════════════════════════════════════════════════
   ReportsTable — client island for admin Daily Reports.

   The page stays a server component (query untouched); this receives
   plain serializable rows + the business-date "today" string and owns
   only the expansion state. Desktop table (md+) and mobile cards share
   the same toggle logic. Animations are transform-only, decorative,
   and disabled under prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════ */

export interface ReportRow {
  id: string;
  partner_id: string;
  report_date: string;
  leads_contacted: number | null;
  appointments_booked: number | null;
  deals_closed: number | null;
  biggest_challenge: string | null;
  additional_notes: string | null;
  created_at: string | null;
  partnerName: string;
  companyId: string | null;
}

interface ReportsTableProps {
  rows: ReportRow[];
  todayStr: string;
  /** Test/SSR hook: rows that render expanded on first paint. */
  defaultExpandedIds?: string[];
}

const COLUMN_COUNT = 8;

function isBlank(text: string | null): boolean {
  return !text || text.trim().length === 0;
}

/** Zero = muted 400; non-zero = strong 600. Token-only classes. */
function numClass(value: number | null): string {
  const n = value ?? 0;
  return n === 0
    ? "font-normal text-[var(--text-3)]"
    : "font-semibold text-[var(--text-1)]";
}

function SubmittedLine({ createdAt }: { createdAt: string | null }) {
  if (!createdAt) return null;
  const zone = getViewerShortZoneName(new Date(createdAt));
  return (
    <p className="mt-3 text-[12px] tabular-nums text-[var(--text-3)]">
      Submitted {formatJobDateTime(createdAt)}{zone ? ` ${zone}` : ""}
    </p>
  );
}

function DetailsGrid({ row }: { row: ReportRow }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] bg-[var(--hover-bg)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
            Biggest challenge
          </p>
          {isBlank(row.biggest_challenge) ? (
            <p className="mt-1.5 text-[14px] leading-[1.6] text-[var(--text-3)]">
              No challenge reported.
            </p>
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-[1.6] text-[var(--text-1)]">
              {row.biggest_challenge}
            </p>
          )}
        </div>
        <div className="rounded-[12px] bg-[var(--hover-bg)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
            Additional notes
          </p>
          {isBlank(row.additional_notes) ? (
            <p className="mt-1.5 text-[14px] leading-[1.6] text-[var(--text-3)]">
              No notes added.
            </p>
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-[1.6] text-[var(--text-1)]">
              {row.additional_notes}
            </p>
          )}
        </div>
      </div>
      <SubmittedLine createdAt={row.created_at} />
    </div>
  );
}

export function ReportsTable({ rows, todayStr, defaultExpandedIds = [] }: ReportsTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const id of defaultExpandedIds) initial[id] = true;
    return initial;
  });

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      {/* ── Desktop table (md and up) ── */}
      <div className="hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden md:block">
        <div className="overflow-auto max-h-[min(70vh,720px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Partner
                </th>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Date
                </th>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Contacted
                </th>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Appts
                </th>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Deals
                </th>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Challenge
                </th>
                <th className="sticky top-0 z-[1] whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                  Notes
                </th>
                <th className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--surface)] px-2 py-3">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = !!expanded[row.id];
                const detailsId = `report-details-${row.id}`;
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("a,button")) return;
                        toggle(row.id);
                      }}
                      className="cursor-pointer border-b border-[var(--border-subtle)] transition-colors duration-150 last:border-0 hover:bg-[var(--hover-bg)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={row.partnerName} size="md" />
                          <div className="min-w-0">
                            <p
                              className="truncate text-[14px] font-medium text-[var(--text-1)]"
                              title={row.partnerName}
                            >
                              {row.partnerName}
                            </p>
                            {row.companyId && (
                              <p className="truncate text-[12px] tabular-nums text-[var(--text-3)]">
                                {row.companyId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[13px] text-[var(--text-2)]">
                        <span title={row.report_date}>
                          {formatReportDate(row.report_date, todayStr)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums text-[13px] ${numClass(row.leads_contacted)}`}>
                        {row.leads_contacted ?? 0}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums text-[13px] ${numClass(row.appointments_booked)}`}>
                        {row.appointments_booked ?? 0}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums text-[13px] ${numClass(row.deals_closed)}`}>
                        {row.deals_closed ?? 0}
                      </td>
                      <td className="min-w-[220px] px-4 py-3 text-[13px] text-[var(--text-2)]">
                        {isBlank(row.biggest_challenge) ? (
                          <span className="text-[var(--text-3)]">—</span>
                        ) : (
                          <span className="line-clamp-2">{row.biggest_challenge}</span>
                        )}
                      </td>
                      <td className="min-w-[220px] px-4 py-3 text-[13px] text-[var(--text-2)]">
                        {isBlank(row.additional_notes) ? (
                          <span className="text-[var(--text-3)]">—</span>
                        ) : (
                          <span className="line-clamp-2">{row.additional_notes}</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(row.id);
                          }}
                          aria-expanded={open}
                          aria-controls={detailsId}
                          aria-label={open ? "Hide full report" : "Show full report"}
                          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-3)] transition-colors duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr key={`${row.id}-details`} id={detailsId}>
                        <td colSpan={COLUMN_COUNT} className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 pb-4">
                          <DetailsGrid row={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards (below md) ── */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const open = !!expanded[row.id];
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => toggle(row.id)}
              aria-expanded={open}
              aria-label={open ? "Hide full report" : "Show full report"}
              className="block min-h-[44px] w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-soft)] transition-colors duration-150 hover:bg-[var(--hover-bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <div className="flex items-center gap-3">
                <Avatar name={row.partnerName} size="md" className="h-9 w-9 text-[12px]" />
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--text-1)]">
                  {row.partnerName}
                </p>
                <span
                  className="shrink-0 text-right text-[13px] tabular-nums text-[var(--text-2)]"
                  title={row.report_date}
                >
                  {formatReportDate(row.report_date, todayStr)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-[12px] bg-[var(--hover-bg)] px-2 py-2 text-center">
                  <p className={`text-[18px] tabular-nums ${numClass(row.leads_contacted)}`}>
                    {row.leads_contacted ?? 0}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-3)]">Contacted</p>
                </div>
                <div className="rounded-[12px] bg-[var(--hover-bg)] px-2 py-2 text-center">
                  <p className={`text-[18px] tabular-nums ${numClass(row.appointments_booked)}`}>
                    {row.appointments_booked ?? 0}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-3)]">Appts</p>
                </div>
                <div className="rounded-[12px] bg-[var(--hover-bg)] px-2 py-2 text-center">
                  <p className={`text-[18px] tabular-nums ${numClass(row.deals_closed)}`}>
                    {row.deals_closed ?? 0}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-3)]">Deals</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                    Challenge
                  </p>
                  {isBlank(row.biggest_challenge) ? (
                    <p className="mt-0.5 text-[13px] text-[var(--text-3)]">—</p>
                  ) : open ? (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--text-2)]">
                      {row.biggest_challenge}
                    </p>
                  ) : (
                    <p className="line-clamp-2 mt-0.5 text-[13px] leading-relaxed text-[var(--text-2)]">
                      {row.biggest_challenge}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                    Notes
                  </p>
                  {isBlank(row.additional_notes) ? (
                    <p className="mt-0.5 text-[13px] text-[var(--text-3)]">—</p>
                  ) : open ? (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--text-2)]">
                      {row.additional_notes}
                    </p>
                  ) : (
                    <p className="line-clamp-2 mt-0.5 text-[13px] leading-relaxed text-[var(--text-2)]">
                      {row.additional_notes}
                    </p>
                  )}
                </div>
              </div>
              {open && (
                <div className="mt-2">
                  <SubmittedLine createdAt={row.created_at} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
