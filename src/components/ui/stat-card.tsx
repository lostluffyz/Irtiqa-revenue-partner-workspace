"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";

interface StatCardProps {
  value: number;
  label: string;
  /** Optional muted sub-label under the label (e.g. what a composite metric means). */
  sub?: string;
  /** Optional extra classes for the value (e.g. status-toned numbers). */
  valueClassName?: string;
  onClick?: () => void;
}

/**
 * StatCard — Pure metric display. Number + label only.
 *
 * Design language: No icons, no descriptions. The number is the hero.
 * Used in stat rows on Dashboard, Partners, Leads pages.
 *
 * Design tokens: --type-title, --type-caption, --sp-4, --dl-surface
 */
export function StatCard({ value, label, sub, valueClassName = "", onClick }: StatCardProps) {
  return (
    <div
      className={`dl-surface px-4 py-3 ${onClick ? "dl-surface-hover cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <p className={`dl-type-title dl-tabular ${valueClassName}`}>
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-0.5 dl-type-caption">{label}</p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--text-3)]">{sub}</p>
      )}
    </div>
  );
}
