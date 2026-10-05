"use client";

import { TrendingUp } from "lucide-react";

interface ProgressProps {
  programDay: number;
  daysRemaining: number;
  progressPct: number;
}

export function MobileProgress({ programDay, daysRemaining, progressPct }: ProgressProps) {
  return (
    <div className="mobile-section-card">
      <div className="mobile-section-header">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)] mb-2">
            Program Progress
          </p>
          <div className="flex items-baseline gap-2.5">
            <span className="mobile-progress-day">Day {programDay}</span>
            <span className="mobile-progress-sub">of 30 · {daysRemaining} days remaining</span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent-light)]">
          <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
        </div>
      </div>

      <div className="mobile-section-body">
        <div
          className="mobile-progress-bar-container"
          role="progressbar"
          aria-valuenow={programDay}
          aria-valuemin={0}
          aria-valuemax={30}
          aria-label={`Program progress: day ${programDay} of 30`}
        >
          <div
            className="mobile-progress-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
