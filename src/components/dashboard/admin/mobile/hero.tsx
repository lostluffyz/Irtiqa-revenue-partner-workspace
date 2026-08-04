"use client";

interface HeroProps {
  firstName: string;
  unassignedLeads: number;
  reportsToday: number;
  appointmentsToday: number;
}

export function MobileHero({ firstName, unassignedLeads, reportsToday, appointmentsToday }: HeroProps) {
  return (
    <div className="mobile-hero">
      <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)] leading-[1.15]">
        Good morning, {firstName}
      </h1>
      <p className="mt-2.5 text-[15px] text-[var(--text-2)] leading-relaxed">
        {unassignedLeads > 0
          ? `${unassignedLeads} lead${unassignedLeads !== 1 ? "s" : ""} waiting for assignment — ${reportsToday} report${reportsToday !== 1 ? "s" : ""} submitted today.`
          : reportsToday > 0
            ? `${reportsToday} report${reportsToday !== 1 ? "s" : ""} submitted today. ${appointmentsToday} appointment${appointmentsToday !== 1 ? "s" : ""} booked.`
            : "Here's what's happening with your revenue partners today."}
      </p>
    </div>
  );
}
