"use client";

/**
 * LoadingProgress — Thin indeterminate progress bar.
 *
 * Premium loading indicator similar to GitHub/Linear.
 * A thin, animated bar that sweeps across the screen.
 * Uses the existing accent color for brand consistency.
 *
 * Supports:
 * - Indeterminate mode (default, animated sweep)
 * - Reduced motion (static thin line)
 */
export function LoadingProgress() {
  return (
    <div
      className="loading-progress-track"
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy={true}
    >
      <div className="loading-progress-bar" />
    </div>
  );
}
