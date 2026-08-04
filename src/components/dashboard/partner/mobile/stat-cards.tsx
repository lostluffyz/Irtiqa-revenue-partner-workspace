"use client";

import Link from "next/link";
import { Target, FileText, CalendarCheck, TrendingUp } from "lucide-react";

interface StatCardsProps {
  totalLeads: number;
  totalLeadsContacted: number;
  totalAppointments: number;
  totalDeals: number;
}

export function MobileStatCards({ totalLeads, totalLeadsContacted, totalAppointments, totalDeals }: StatCardsProps) {
  return (
    <div className="mobile-stat-grid">
      <MobileStatCard
        icon={<Target className="h-5 w-5 text-[#1A56DB]" />}
        iconBg="bg-[#EFF6FF]"
        value={totalLeads}
        label="Total Leads"
        helper={totalLeads > 0 ? `${totalLeads} assigned` : "No leads yet"}
        href="/partner/leads"
      />
      <MobileStatCard
        icon={<FileText className="h-5 w-5 text-[#1A56DB]" />}
        iconBg="bg-[#EFF6FF]"
        value={totalLeadsContacted}
        label="Leads Contacted"
        helper={
          totalLeads > 0
            ? `${Math.round((totalLeadsContacted / totalLeads) * 100)}% of total`
            : "No data yet"
        }
      />
      <MobileStatCard
        icon={<CalendarCheck className="h-5 w-5 text-[#D97706]" />}
        iconBg="bg-[#FFFBEB]"
        value={totalAppointments}
        label="Appointments"
        helper={totalAppointments > 0 ? "Booked" : "None yet"}
      />
      <MobileStatCard
        icon={<TrendingUp className="h-5 w-5 text-[#059669]" />}
        iconBg="bg-[#ECFDF5]"
        value={totalDeals}
        label="Deals Closed"
        helper={totalDeals > 0 ? "Closed deals" : "No deals yet"}
      />
    </div>
  );
}

function MobileStatCard({
  icon,
  iconBg,
  value,
  label,
  helper,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  helper: string;
  href?: string;
}) {
  const content = (
    <div className="mobile-stat-card mobile-card-press">
      <div className={`mobile-stat-icon-wrap ${iconBg} flex h-10 w-10 items-center justify-center rounded-[10px]`}>
        {icon}
      </div>
      <p className="text-[26px] font-bold leading-none tracking-[-0.02em] text-[var(--text-1)] tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-[var(--text-2)]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
        {helper}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
