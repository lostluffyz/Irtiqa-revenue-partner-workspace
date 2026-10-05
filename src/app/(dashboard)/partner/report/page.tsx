import { requirePartner, PROGRAM_TIMEZONE } from "@/lib/partner";
import { getBusinessDate } from "@/lib/program-timezone";
import { getComplianceConfig } from "@/lib/compliance";
import { redirect } from "next/navigation";
import { DailyReportView } from "./daily-report-form";
import type { DailyReport } from "@/types/database";

export default async function PartnerReportPage() {
  const { partner, supabase } = await requirePartner().catch(() => {
    throw redirect("/login");
  });

  const today = getBusinessDate(PROGRAM_TIMEZONE);

  const { data: existingReport } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("partner_id", partner.id)
    .eq("report_date", today)
    .maybeSingle();

  const report = existingReport as DailyReport | null;

  // Deadline display values only — same config source the dashboard uses.
  const { deadlineHour, deadlineMinute } = getComplianceConfig();

  return (
    <div className="max-w-2xl mx-auto">
      <DailyReportView report={report} date={today} deadlineHour={deadlineHour} deadlineMinute={deadlineMinute} />
    </div>
  );
}
