"use client";

import { DashboardEntrance } from "@/components/loading/dashboard-entrance";
import { MobileHero } from "./hero";
import { MobileStatCards } from "./stat-cards";
import { MobileCompliance } from "./compliance";
import { MobileProgress } from "./progress";
import { MobilePipeline } from "./pipeline";
import { MobileAnnouncements } from "./announcements";
import { MobileActivity } from "./activity";
import type { PartnerPageData } from "@/components/dashboard/helpers";

export function MobilePartnerDashboard({ pageData }: { pageData: PartnerPageData }) {
  const { data, complianceStatus, greeting, firstName, dayOfWeek, monthDay, progressPct, daysRemaining } = pageData;

  return (
    <div className="space-y-5">
      <DashboardEntrance delay={0}>
        <MobileHero
          greeting={greeting}
          firstName={firstName}
          dayOfWeek={dayOfWeek}
          monthDay={monthDay}
          programDay={data.programDay}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={50}>
        <MobileCompliance
          status={complianceStatus.status}
          deadlineHour={complianceStatus.deadline_hour}
          deadlineMinute={complianceStatus.deadline_minute}
          overdueDuration={complianceStatus.overdue_duration}
          todayReport={data.todayReport}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={100}>
        <MobileStatCards
          totalLeads={data.totalLeads}
          totalLeadsContacted={data.totalLeadsContacted}
          totalAppointments={data.totalAppointments}
          totalDeals={data.totalDeals}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={150}>
        <MobileProgress
          programDay={data.programDay}
          daysRemaining={daysRemaining}
          progressPct={progressPct}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={200}>
        <MobilePipeline
          totalLeads={data.totalLeads}
          totalLeadsContacted={data.totalLeadsContacted}
          totalAppointments={data.totalAppointments}
          totalDeals={data.totalDeals}
        />
      </DashboardEntrance>

      <DashboardEntrance delay={250}>
        <MobileAnnouncements announcements={data.announcements} />
      </DashboardEntrance>

      <DashboardEntrance delay={300}>
        <MobileActivity
          programDay={data.programDay}
          todayReport={data.todayReport}
          totalReports={data.totalReports}
          announcements={data.announcements}
          totalLeads={data.totalLeads}
        />
      </DashboardEntrance>
    </div>
  );
}
