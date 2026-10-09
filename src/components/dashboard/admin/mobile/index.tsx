"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { DashboardEntrance } from "@/components/loading/dashboard-entrance";
import { MobileHero } from "./hero";
import { MobileQuickActions } from "./quick-actions";
import { MobileStats } from "./stats";
import { MobileCompliance } from "./compliance";
import { MobileReports } from "./reports";
import { MobileActivity } from "./activity";
import { MobileAnnouncements } from "./announcements";
import type { AdminDashboardData } from "@/components/dashboard/helpers";

export function MobileAdminDashboard({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-5">
      <DashboardEntrance delay={0}>
        <MobileHero
          firstName={data.firstName}
          reportsToday={data.counts.reportsToday}
          appointmentsToday={data.counts.appointmentsToday}
          activePartners={data.counts.activePartners}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={50}>
        <MobileStats counts={data.counts} compliance={data.compliance} />
      </DashboardEntrance>

      {data.counts.unassignedLeads > 0 && (
        <Link
          href="/admin/leads?assignment=unassigned"
          className="flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50/60 px-4 py-3 group"
          aria-label={`${data.counts.unassignedLeads} leads waiting for assignment. View unassigned leads.`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-[13px] text-amber-800">
            <span className="font-semibold">{data.counts.unassignedLeads}</span> lead{data.counts.unassignedLeads !== 1 ? "s" : ""} waiting for assignment
          </p>
          <span className="ml-auto text-[12px] font-medium text-amber-700 whitespace-nowrap">
            View →
          </span>
        </Link>
      )}

      <DashboardEntrance delay={100}>
        <MobileQuickActions />
      </DashboardEntrance>

      <DashboardEntrance delay={150}>
        <MobileCompliance compliance={data.compliance} />
      </DashboardEntrance>

      <DashboardEntrance delay={200}>
        <MobileReports reports={data.recentReports} />
      </DashboardEntrance>

      <DashboardEntrance delay={250}>
        <MobileActivity activities={data.recentActivity} />
      </DashboardEntrance>

      <DashboardEntrance delay={300}>
        <MobileAnnouncements announcements={data.recentAnnouncements} />
      </DashboardEntrance>
    </div>
  );
}
