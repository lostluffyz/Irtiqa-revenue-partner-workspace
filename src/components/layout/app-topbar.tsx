"use client";

import { ChevronRight, Clock } from "lucide-react";
import { SafeLiveClock } from "@/components/ui/safe-live-clock";
import { Avatar } from "@/components/ui/avatar";
import type { BreadcrumbSegments } from "@/components/dashboard/helpers";

/* ══════════════════════════════════════════════════════════════
   AppTopbar — floating desktop top bar (admin + partner)

   Rendered inside <main> as its first child so position: sticky
   keeps it visible while page content scrolls beneath it.
   ══════════════════════════════════════════════════════════════ */

interface AppTopbarProps {
  segments: BreadcrumbSegments;
  avatarName: string;
}

export function AppTopbar({ segments, avatarName }: AppTopbarProps) {
  return (
    <header className="app-topbar sticky top-3 z-[29] mx-3 mt-3 hidden h-14 shrink-0 items-center justify-between rounded-[18px] border border-[var(--border)] px-4 shadow-[var(--shadow-soft)] md:flex">
      <div className="flex items-center gap-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[14px]">
            <li className="text-[var(--text-2)]">{segments.section}</li>
            <li aria-hidden="true" className="text-[var(--text-3)]">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="text-[14px] font-semibold text-[var(--text-1)]">{segments.page}</li>
          </ol>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5 tabular-nums lg:flex">
          <Clock className="h-[14px] w-[14px] shrink-0 text-[var(--text-3)]" />
          <SafeLiveClock showLabel />
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--hover-bg)]">
          <Avatar name={avatarName} size="sm" />
        </span>
      </div>
    </header>
  );
}
