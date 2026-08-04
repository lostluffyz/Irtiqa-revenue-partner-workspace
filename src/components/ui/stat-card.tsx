"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";

interface StatCardProps {
  value: number;
  label: string;
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
export function StatCard({ value, label, onClick }: StatCardProps) {
  return (
    <div
      className={`dl-surface dl-surface-hover px-4 py-3 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <p className="dl-type-title dl-tabular">
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-0.5 dl-type-caption">{label}</p>
    </div>
  );
}
