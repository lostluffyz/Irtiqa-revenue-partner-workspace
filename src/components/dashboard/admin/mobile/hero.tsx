"use client";

import { useAdminGreeting } from "@/components/dashboard/admin/use-admin-greeting";

interface HeroProps {
  firstName: string;
  reportsToday: number;
  appointmentsToday: number;
  activePartners: number;
}

export function MobileHero({ firstName, reportsToday, appointmentsToday, activePartners }: HeroProps) {
  const greeting = useAdminGreeting();
  const subtitle =
    reportsToday > 0
      ? `${reportsToday} report${reportsToday !== 1 ? "s" : ""} submitted today · ${activePartners} active partner${activePartners !== 1 ? "s" : ""}.`
      : activePartners > 0
        ? `${activePartners} active partner${activePartners !== 1 ? "s" : ""} · ${appointmentsToday} appointment${appointmentsToday !== 1 ? "s" : ""} booked today.`
        : "Here's what's happening with your revenue partners today.";

  return (
    <div className="mobile-hero">
      <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)] leading-[1.15]">
        <span key={greeting ?? "pending"} className="animate-fade-in inline-block">
          {greeting ?? "\u00A0"}
        </span>
        , {firstName}
      </h1>
      <p className="mt-2.5 text-[15px] text-[var(--text-2)] leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
