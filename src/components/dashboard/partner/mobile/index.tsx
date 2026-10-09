"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  const hasAnnouncements = data.announcements.length > 0;
  const hasActivity = !!data.todayReport || hasAnnouncements;

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

      {hasAnnouncements && (
        <DashboardEntrance delay={250}>
          <MobileAnnouncements announcements={data.announcements} />
        </DashboardEntrance>
      )}

      {hasActivity ? (
        <DashboardEntrance delay={300}>
          <MobileActivity
            todayReport={data.todayReport}
            announcements={data.announcements}
          />
        </DashboardEntrance>
      ) : (
        <div className="mobile-section-card">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
            <p className="text-[13px] text-[var(--text-2)]">Nothing new right now.</p>
            <Link
              href="/partner/announcements"
              className="inline-flex min-h-[44px] items-center gap-1 text-[12px] font-medium text-[var(--text-3)]"
            >
              View announcements
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
