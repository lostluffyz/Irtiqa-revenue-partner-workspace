"use client";

import { Badge } from "@/components/ui/badge";
import { useAdminGreeting } from "@/components/dashboard/admin/use-admin-greeting";

interface HeroProps {
  greeting: string;
  firstName: string;
  dayOfWeek: string;
  monthDay: string;
  programDay: number;
}

export function MobileHero({ greeting, firstName, dayOfWeek, monthDay, programDay }: HeroProps) {
  const localGreeting = useAdminGreeting();
  return (
    <div className="mobile-hero">
      <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)] leading-[1.15]">
        {localGreeting ?? greeting}, {firstName}
      </h1>
      <div className="flex items-center gap-2.5 mt-2.5">
        <p className="text-[15px] text-[var(--text-3)]">
          {dayOfWeek}, {monthDay}
        </p>
        <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
        <Badge variant={programDay > 25 ? "warning" : "info"} className="text-[12px]">
          Day {programDay}
        </Badge>
      </div>
    </div>
  );
}
