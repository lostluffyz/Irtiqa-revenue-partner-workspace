"use client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DistributionEntry {
  partnerId: string;
  partnerName: string;
  currentLoad: number;
  incoming: number;
  finalTotal: number;
}

export interface DistributionPreviewProps {
  /** Distribution entries to display. */
  entries: DistributionEntry[];
  /** Whether this is an auto-balance distribution. */
  isAutoBalance?: boolean;
  /** Total leads requested. */
  totalRequested?: number;
}

// ---------------------------------------------------------------------------
// DistributionPreview
// ---------------------------------------------------------------------------

/**
 * Per-partner breakdown table with progress bars.
 * Reusable outside Smart Assignment — no domain-specific imports.
 */
export function DistributionPreview({
  entries,
  isAutoBalance = false,
  totalRequested,
}: DistributionPreviewProps) {
  if (entries.length === 0) return null;

  // Scale progress bars to max finalTotal
  const maxLoad = Math.max(...entries.map((e) => e.finalTotal), 1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">
          Distribution Preview
        </p>
        {totalRequested !== undefined && (
          <p className="text-[11px] text-[var(--text-3)]">
            {totalRequested.toLocaleString()} leads across {entries.length} partner
            {entries.length !== 1 ? "s" : ""}
            {isAutoBalance ? " (auto-balanced)" : ""}
          </p>
        )}
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[var(--canvas)] border-b border-[var(--border-subtle)]">
              <th className="text-left px-3 py-1.5 font-medium text-[var(--text-3)]">
                Partner
              </th>
              <th className="text-right px-3 py-1.5 font-medium text-[var(--text-3)] w-20">
                Current
              </th>
              <th className="text-right px-3 py-1.5 font-medium text-[var(--text-3)] w-20">
                Incoming
              </th>
              <th className="text-right px-3 py-1.5 font-medium text-[var(--text-3)] w-20">
                Final
              </th>
              <th className="px-3 py-1.5 font-medium text-[var(--text-3)] w-32">
                Load
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const barWidth = Math.max(2, (entry.finalTotal / maxLoad) * 100);
              return (
                <tr
                  key={entry.partnerId}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--hover-bg)] transition-colors duration-100"
                >
                  <td className="px-3 py-2 text-[var(--text-1)] font-medium">
                    {entry.partnerName}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-2)] tabular-nums">
                    {entry.currentLoad.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--status-success)] font-medium tabular-nums">
                    +{entry.incoming.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-[var(--text-1)] tabular-nums">
                    {entry.finalTotal.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="w-full h-2 bg-[var(--canvas)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
