"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, LayoutGroup } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { hideLoading } from "@/lib/loading-manager";
import { PageTransition } from "@/components/ui/page-transition";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import { SafeLiveClock } from "@/components/ui/safe-live-clock";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Activity,
  Megaphone,
  BookOpen,
  CalendarCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";

const NAV_INDICATOR_ID = "admin-nav-indicator";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV = {
  overview: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  ],
  manage: [
    { href: "/admin/partners", label: "Partners", icon: Users },
    { href: "/admin/leads", label: "Leads", icon: Target },
  ],
  operate: [
    { href: "/admin/allocation", label: "Allocation", icon: CalendarCheck },
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/activity", label: "Activity", icon: Activity },
  ],
  communicate: [
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/resources", label: "Resources", icon: BookOpen },
  ],
};

const SECTION_TITLES: Record<string, string> = {
  manage: "Manage",
  operate: "Operate",
  communicate: "Communicate",
};

/* ══════════════════════════════════════════════════════════════
   NavLink — shared by desktop sidebar and mobile drawer
   ══════════════════════════════════════════════════════════════ */

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
      className={`relative flex items-center text-[13px] transition-colors duration-150 rounded-[8px] mb-0.5 ${
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
   DesktopSidebar — desktop only, never rendered on mobile
   ══════════════════════════════════════════════════════════════ */

function DesktopSidebar({
  collapsed,
  onToggle,
  adminName,
}: {
  collapsed: boolean;
  onToggle: () => void;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));

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
          href="/admin"
          className={`flex items-center shrink-0 ${collapsed ? "justify-center" : ""}`}
        >
          {!collapsed && <Brand color="dark" size="sm" className="label-collapse" />}
        </Link>

        {!collapsed && (
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--hover-bg)] transition-colors duration-150"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
        {collapsed && (
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
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3">
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

      {/* ── Footer: User + Sign out ── */}
      <div className="shrink-0 border-t border-[var(--border-subtle)]">
        {!collapsed && (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={adminName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[var(--text-1)] leading-tight">
                  {adminName}
                </p>
                <p className="truncate text-[11px] text-[var(--text-3)] leading-tight mt-0.5">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-3">
            <Avatar name={adminName} size="sm" />
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
            <span className="label-collapse whitespace-nowrap">Sign out</span>
          )}
        </button>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════
   MobileDrawer — portal'd to <body>, zero dashboard interaction

   Renders via createPortal directly into document.body.
   Completely outside the dashboard DOM tree.
   The dashboard never knows this exists.
   ══════════════════════════════════════════════════════════════ */

function MobileDrawer({
  open,
  onToggle,
  onClose,
  adminName,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  adminName: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ── FAB: hamburger ↔ X, never moves ── */}
      <button
        onClick={onToggle}
        className={`mobile-fab md:hidden ${open ? "is-open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <div className="mobile-fab-icon">
          <span />
          <span />
          <span />
        </div>
      </button>

      {/* ── Backdrop: fixed, blurred, fades in ── */}
      <div
        className={`mobile-sidebar-overlay md:hidden ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      {/* ── Drawer: fixed, slides from left, above everything ── */}
      <MobileDrawerPanel open={open} onClose={onClose} adminName={adminName} />
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
  adminName,
}: {
  open: boolean;
  onClose: () => void;
  adminName: string;
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

  const handleNavClick = () => onClose();

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));

  return (
    <div className={`mobile-sidebar md:hidden ${open ? "is-open" : ""}`}>
      <aside className="sidebar flex flex-col h-full w-[var(--sidebar-width)]">
        {/* ── Brand ── */}
        <div className="flex items-center shrink-0 h-[56px] px-4">
          <Link href="/admin" className="flex items-center shrink-0" onClick={handleNavClick}>
            <Brand color="dark" size="sm" />
          </Link>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3" onClick={handleNavClick}>
          <LayoutGroup>
            {NAV.overview.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item)}
                collapsed={false}
                layoutId={NAV_INDICATOR_ID}
              />
            ))}

            <div className="h-px bg-[var(--border-subtle)] mx-2 my-3" />

            {(Object.keys(NAV) as Array<keyof typeof NAV>)
              .slice(1)
              .map((group) => (
                <div key={group} className="mb-3">
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-3)]">
                    {SECTION_TITLES[group]}
                  </p>
                  <div>
                    {NAV[group].map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        active={isActive(item)}
                        collapsed={false}
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
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={adminName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[var(--text-1)] leading-tight">
                  {adminName}
                </p>
                <p className="truncate text-[11px] text-[var(--text-3)] leading-tight mt-0.5">
                  Administrator
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-5 py-2.5 text-[13px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--hover-bg)] transition-colors duration-150"
            title="Sign out"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="whitespace-nowrap">Sign out</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AdminShell — the main export
   ══════════════════════════════════════════════════════════════ */

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);

  // Hide the loading overlay when the admin shell mounts
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
        <DesktopSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          adminName={adminName}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="hidden md:flex items-center justify-between h-14 px-6 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
              <span className="text-[var(--text-2)] font-medium">Revenue Partner</span>
              <span className="text-[var(--text-3)]">/</span>
              <span>Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <SafeLiveClock showLabel />
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <Avatar name={adminName} size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-4 py-6 md:px-10 md:py-8 mobile-content-pad md:!p-0 md:!pt-0">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* ── Mobile Drawer — portal'd to <body>, invisible to this layout ── */}
      <MobileDrawer open={mobileOpen} onToggle={toggleMobile} onClose={closeMobile} adminName={adminName} />
    </div>
  );
}
