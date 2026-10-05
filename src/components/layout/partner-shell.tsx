"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, LayoutGroup } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { hideLoading } from "@/lib/loading-manager";
import { PageTransition } from "@/components/ui/page-transition";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import { SafeLiveClock } from "@/components/ui/safe-live-clock";
import { getBreadcrumbSegments } from "@/components/dashboard/helpers";
import {
  LayoutDashboard,
  Target,
  FileText,
  TrendingUp,
  BookOpen,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Ellipsis,
  X,
} from "lucide-react";

const NAV_INDICATOR_ID = "partner-nav-indicator";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV = {
  overview: [
    { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
  ],
  manage: [
    { href: "/partner/leads", label: "My Leads", icon: Target },
  ],
  operate: [
    { href: "/partner/report", label: "Daily Report", icon: FileText },
    { href: "/partner/progress", label: "Progress", icon: TrendingUp },
  ],
  communicate: [
    { href: "/partner/announcements", label: "Announcements", icon: Megaphone },
    { href: "/partner/resources", label: "Resources", icon: BookOpen },
  ],
};

const SECTION_TITLES: Record<string, string> = {
  manage: "Manage",
  operate: "Operate",
  communicate: "Communicate",
};

function NavLink({
  item,
  active,
  collapsed,
  layoutId,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  layoutId: string;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={`relative flex items-center text-[13px] transition-colors duration-150 rounded-[8px] mb-0.5 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px] ${
        collapsed
          ? "justify-center h-[36px]"
          : "gap-2.5 px-3 py-[7px]"
      } ${
        active
          ? "font-medium text-[var(--text-1)]"
          : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
      }`}
      title={collapsed ? item.label : undefined}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-[var(--hover-bg)] rounded-[8px]"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-[7px] bottom-[7px] z-10 w-[3px] rounded-full bg-[var(--accent)]"
        />
      )}
      <item.icon
        className={`relative z-10 h-[18px] w-[18px] shrink-0 ${
          active ? "text-[var(--accent)]" : "text-[var(--text-3)]"
        }`}
      />
      {!collapsed && (
        <span className="relative z-10 label-collapse whitespace-nowrap">
          {item.label}
        </span>
      )}
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════
   Sidebar — used by both desktop and mobile (mobile via portal)
   ══════════════════════════════════════════════════════════════ */

function Sidebar({
  collapsed,
  onToggle,
  partnerName,
  isMobile = false,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  partnerName: string;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    if (isMobile && onCloseMobile) onCloseMobile();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleNavClick = () => {
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/partner" && pathname.startsWith(item.href));

  return (
    <aside
      className={`sidebar flex flex-col h-full transition-[width] duration-200 ease-out ${
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
      }`}
    >
      {/* ── Brand ── */}
      <div
        className={`flex items-center shrink-0 h-[56px] transition-all duration-200 ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        <Link
          href="/partner"
          className={`flex items-center shrink-0 ${
            collapsed ? "justify-center" : ""
          }`}
          onClick={handleNavClick}
        >
          {!collapsed && (
            <Brand color="dark" size="sm" className="label-collapse" />
          )}
        </Link>

        {/* Mobile close button — the FAB is gone, this + overlay + Esc close the drawer */}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Desktop toggle button */}
        {!isMobile && !collapsed && (
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--hover-bg)] transition-colors duration-150"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
        {!isMobile && collapsed && (
          <button
            onClick={onToggle}
            className="hidden md:flex absolute top-3 -right-3 items-center justify-center w-[22px] h-[22px] rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] hover:border-[#D1D5DB] transition-colors duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3" onClick={handleNavClick} aria-label="Primary">
        <LayoutGroup>
          {NAV.overview.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item)}
              collapsed={collapsed}
              layoutId={NAV_INDICATOR_ID}
            />
          ))}

          <div className="h-px bg-[var(--border-subtle)] mx-2 my-3" />

          {(Object.keys(NAV) as Array<keyof typeof NAV>)
            .slice(1)
            .map((group) => (
              <div key={group} className="mb-3">
                {!collapsed && (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                    {SECTION_TITLES[group]}
                  </p>
                )}
                <div>
                  {NAV[group].map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item)}
                      collapsed={collapsed}
                      layoutId={NAV_INDICATOR_ID}
                    />
                  ))}
                </div>
              </div>
            ))}
        </LayoutGroup>
      </nav>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-[var(--border-subtle)]">
        {!collapsed && (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={partnerName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[var(--text-1)] leading-tight">
                  {partnerName}
                </p>
                <p className="truncate text-[11px] text-[var(--text-3)] leading-tight mt-0.5">
                  Partner
                </p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-3">
            <Avatar name={partnerName} size="sm" />
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-2.5 text-[13px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--hover-bg)] transition-colors duration-150 ${
            collapsed ? "justify-center h-[40px]" : "px-5 py-2.5"
          }`}
          title="Sign out"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && (
            <span className="label-collapse whitespace-nowrap">
              Sign out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

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
  useEffect(() => {
    if (!mounted) return;
    if (open) {
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
    returnFocusRef.current?.focus();
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
  return (
    <div
      id="partner-mobile-menu"
      role="dialog"
      aria-label="Menu"
      className={`mobile-sidebar md:hidden ${open ? "is-open" : ""}`}
    >
      <Sidebar
        collapsed={false}
        onToggle={onClose}
        partnerName={partnerName}
        isMobile
        onCloseMobile={onClose}
      />
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

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const crumbs = getBreadcrumbSegments(pathname);

  const isActiveTab = (href: string) =>
    pathname === href || (href !== "/partner" && pathname.startsWith(href));

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
    <div className="flex h-screen overflow-hidden bg-[var(--canvas)]">
      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:block shrink-0 h-full relative">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          partnerName={partnerName}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="hidden md:flex items-center justify-between h-14 px-6 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-[13px]">
                <li className="text-[var(--text-2)]">{crumbs.section}</li>
                <li aria-hidden="true" className="text-[var(--text-3)]">/</li>
                <li aria-current="page" className="text-[var(--text-1)] font-medium">{crumbs.page}</li>
              </ol>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <SafeLiveClock showLabel />
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <Avatar name={partnerName} size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-4 py-6 md:px-10 md:py-8 mobile-content-pad tabbar-clearance">
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
