import { getPartnerPageData } from "@/components/dashboard/data";
import { redirect } from "next/navigation";
import { HideLoading } from "@/components/loading/hide-loading";
import { DesktopPartnerDashboard } from "@/components/dashboard/partner/desktop";
import { MobilePartnerDashboard } from "@/components/dashboard/partner/mobile";

/* ═══════════════════════════════════════════════════════════════
   Partner Dashboard — Thin server component wrapper

   Fetches data server-side, then renders BOTH mobile and desktop
   component trees. CSS handles which is visible:
   - Mobile:  md:hidden (visible < 768px)
   - Desktop: hidden md:block (visible ≥ 768px)

   No shared layout classes. Completely separate component trees.
   ═══════════════════════════════════════════════════════════════ */

export default async function PartnerDashboard() {
  let pageData;
  try {
    pageData = await getPartnerPageData();
  } catch {
    redirect("/login");
  }

  return (
    <div>
      <HideLoading />

      {/* Mobile dashboard — visible only below md breakpoint */}
      <div className="md:hidden">
        <MobilePartnerDashboard pageData={pageData} />
      </div>

      {/* Desktop dashboard — visible only at md breakpoint and above */}
      <div className="hidden md:block">
        <DesktopPartnerDashboard pageData={pageData} />
      </div>
    </div>
  );
}
