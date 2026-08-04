"use client";

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
          unassignedLeads={data.counts.unassignedLeads}
          reportsToday={data.counts.reportsToday}
          appointmentsToday={data.counts.appointmentsToday}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={50}>
        <MobileQuickActions />
      </DashboardEntrance>

      <DashboardEntrance delay={100}>
        <MobileStats counts={data.counts} compliance={data.compliance} />
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
