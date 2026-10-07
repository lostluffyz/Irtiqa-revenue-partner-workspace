"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { hideLoading } from "@/lib/loading-manager";
import { PageTransition } from "@/components/ui/page-transition";
import { Brand } from "@/components/ui/brand";
import { getBreadcrumbSegments } from "@/components/dashboard/helpers";
import { AppSidebar, PARTNER_NAV_GROUPS } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import {
  LayoutDashboard,
  Target,
  FileText,
  TrendingUp,
  Ellipsis,
  X,
} from "lucide-react";

/* NavLink + Sidebar live in ./app-sidebar (floating AppSidebar). */

/* ══════════════════════════════════════════════════════════════
   MobileDrawer — portal'd to <body>, zero dashboard interaction
   ══════════════════════════════════════════════════════════════ */

function MobileDrawer({
  open,
  onClose,
  partnerName,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  partnerName: string;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape closes; focus moves into the drawer on open and back on close.
  // The prevOpenRef guard prevents stealing focus on first mount.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      prevOpenRef.current = true;
      function handleKey(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
      }
      document.addEventListener("keydown", handleKey);
      const panel = document.getElementById("partner-mobile-menu");
      const first = panel?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
      return () => document.removeEventListener("keydown", handleKey);
    }
    if (prevOpenRef.current) {
      prevOpenRef.current = false;
      returnFocusRef.current?.focus();
    }
    return undefined;
  }, [open, mounted, onClose, returnFocusRef]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ── Backdrop: fixed, blurred, fades in ── */}
      <div
        className={`mobile-sidebar-overlay md:hidden ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      {/* ── Drawer: fixed, slides from left, above everything ── */}
      <MobileDrawerPanel open={open} onClose={onClose} partnerName={partnerName} />
    </>,
    document.body,
  );
}

/* ══════════════════════════════════════════════════════════════
   MobileDrawerPanel — the actual sliding sidebar content
   ══════════════════════════════════════════════════════════════ */

function MobileDrawerPanel({
  open,
  onClose,
  partnerName,
}: {
  open: boolean;
  onClose: () => void;
  partnerName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    onClose();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActiveByHref = (href: string) =>
    pathname === href ||
    (href !== "/partner" && pathname.startsWith(href));

  return (
    <div
      id="partner-mobile-menu"
      role="dialog"
      aria-label="Menu"
      className={`mobile-sidebar md:hidden rounded-r-[24px] ${open ? "is-open" : ""}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-r-[24px]">
        {/* ── Brand + close ── */}
        <div className="flex items-center shrink-0 h-[56px] px-4">
          <Link href="/partner" className="flex items-center shrink-0" onClick={onClose}>
            <Brand color="dark" size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AppSidebar
          groups={PARTNER_NAV_GROUPS}
          pathname={pathname}
          isActive={isActiveByHref}
          collapsed={false}
          onToggleCollapsed={onClose}
          user={{ name: partnerName, roleLabel: "Partner" }}
          brandSubtitle="Partner portal"
          onSignOut={handleSignOut}
          variant="drawer"
          onNavigate={onClose}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PartnerShell — the main export
   ══════════════════════════════════════════════════════════════ */

export function PartnerShell({
  children,
  partnerName,
}: {
  children: React.ReactNode;
  partnerName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const crumbs = getBreadcrumbSegments(pathname);

  const isActiveTab = (href: string) =>
    pathname === href || (href !== "/partner" && pathname.startsWith(href));

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const TABS = [
    { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
    { href: "/partner/leads", label: "My Leads", icon: Target },
    { href: "/partner/report", label: "Report", icon: FileText },
    { href: "/partner/progress", label: "Progress", icon: TrendingUp },
  ] as const;

  // Hide the loading overlay when the partner shell mounts
  useEffect(() => {
    hideLoading();
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--canvas)]"
      style={{ "--sb-w": collapsed ? "72px" : "252px" } as CSSProperties}
    >
      {/* ── Floating desktop sidebar ── */}
      <AppSidebar
        groups={PARTNER_NAV_GROUPS}
        pathname={pathname}
        isActive={isActiveTab}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        user={{ name: partnerName, roleLabel: "Partner" }}
        brandSubtitle="Partner portal"
        onSignOut={handleSignOut}
        variant="desktop"
      />

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden md:ml-[calc(var(--sb-w)+24px)] md:transition-[margin-left] md:duration-[220ms] md:ease-[cubic-bezier(0.2,0.8,0.2,1)]">
        <main className="flex-1 overflow-y-auto">
          <AppTopbar segments={crumbs} avatarName={partnerName} />
          <div className="max-w-[1200px] mx-auto px-4 py-6 md:px-10 md:py-8 mobile-content-pad partner-top-pad tabbar-clearance">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar — partner only, below md ── */}
      <nav
        aria-label="Primary"
        aria-hidden={mobileOpen || undefined}
        inert={mobileOpen || undefined}
        className="md:hidden fixed left-3 right-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 h-16 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-drawer)]"
      >
        <div className="grid h-full grid-cols-5 items-stretch px-1">
          {TABS.map((tab) => {
            const active = isActiveTab(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-[18px] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
              >
                <span
                  className={`flex h-7 items-center justify-center rounded-full px-4 transition-colors duration-150 ${
                    active ? "bg-[var(--accent-light)]" : ""
                  }`}
                >
                  <tab.icon
                    className={`h-5 w-5 ${active ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}
                  />
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    active ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-3)]"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            ref={moreBtnRef}
            onClick={openMobile}
            aria-label="More options"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            aria-controls="partner-mobile-menu"
            className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-[18px] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
          >
            <span
              className={`flex h-7 items-center justify-center rounded-full px-4 transition-colors duration-150 ${
                mobileOpen ? "bg-[var(--accent-light)]" : ""
              }`}
            >
              <Ellipsis className={`h-5 w-5 ${mobileOpen ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`} />
            </span>
            <span
              className={`text-[11px] leading-none ${
                mobileOpen ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-3)]"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer — portal'd to <body>, invisible to this layout ── */}
      <MobileDrawer open={mobileOpen} onClose={closeMobile} partnerName={partnerName} returnFocusRef={moreBtnRef} />
    </div>
  );
}
