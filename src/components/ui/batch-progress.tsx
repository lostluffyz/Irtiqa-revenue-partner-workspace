"use client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchProgressProps {
  /** Current number of items processed. */
  current: number;
  /** Total number of items to process. */
  total: number;
  /** Optional label shown above the bar. */
  label?: string;
  /** Optional status text shown to the right of the count. */
  status?: string;
  /** Whether to show the component. When false, renders nothing. */
  show?: boolean;
}

// ---------------------------------------------------------------------------
// BatchProgress
// ---------------------------------------------------------------------------

/**
 * Animated progress bar for batch processing.
 * Reusable outside Smart Assignment — accepts current/total props.
 *
 * When real streaming is available, replace the client-side timer
 * with actual progress data. The interface (current/total) stays the same.
 */
export function BatchProgress({
  current,
  total,
  label = "Assigning leads...",
  status,
  show = true,
}: BatchProgressProps) {
  if (!show) return null;

  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      {/* Label and count */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[var(--text-1)]">{label}</p>
        <p className="text-[12px] text-[var(--text-3)] tabular-nums">
          {current.toLocaleString()} / {total.toLocaleString()}
          {status && <span className="ml-1.5">{status}</span>}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[var(--canvas)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Percentage */}
      <p className="text-[10px] text-[var(--text-3)] text-right tabular-nums">
        {pct}% complete
      </p>
    </div>
  );
}
